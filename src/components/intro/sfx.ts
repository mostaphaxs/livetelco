/*
  Intro sound effects, synthesised with the Web Audio API (no audio files).
  Browsers only allow sound after a user gesture, so the context starts suspended
  and `unlock()` is called on the first tap / click / key press.
*/

type Ctx = AudioContext & { _out?: GainNode; _echo?: DelayNode };

export function createSfx() {
  const AC = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
    | typeof AudioContext
    | undefined;
  if (!AC) return null;
  const ctx = new AC() as Ctx;

  // master -> destination, plus a soft echo send for space
  const out = ctx.createGain();
  out.gain.value = 0.55;
  out.connect(ctx.destination);
  const echo = ctx.createDelay(1);
  echo.delayTime.value = 0.21;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const echoLp = ctx.createBiquadFilter();
  echoLp.type = "lowpass";
  echoLp.frequency.value = 2400;
  echo.connect(echoLp).connect(fb).connect(echo);
  echoLp.connect(out);
  ctx._out = out;
  ctx._echo = echo;

  const noise = (() => {
    const b = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  })();

  const env = (g: GainNode, t: number, peak: number, attack: number, release: number) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  };
  const live = () => ctx.state === "running";

  let pad: { stop(): void } | null = null;

  return {
    get enabled() {
      return live();
    },
    unlock: () => ctx.resume().catch(() => {}),
    mute(on: boolean) {
      out.gain.setTargetAtTime(on ? 0 : 0.55, ctx.currentTime, 0.05);
    },

    /** low ambient pad under the scene */
    hum() {
      if (!live() || pad) return;
      const t = ctx.currentTime;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 1.2);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 380;
      const oscs = [55, 55.4, 82.4].map((f) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f;
        o.connect(lp);
        o.start(t);
        return o;
      });
      lp.connect(g).connect(out);
      pad = {
        stop() {
          const s = ctx.currentTime;
          g.gain.cancelScheduledValues(s);
          g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), s);
          g.gain.exponentialRampToValueAtTime(0.0001, s + 1.2);
          oscs.forEach((o) => o.stop(s + 1.3));
        },
      };
    },
    stopHum() {
      pad?.stop();
      pad = null;
    },

    /** satellite signal: bright descending ping with echo */
    ping() {
      if (!live()) return;
      const t = ctx.currentTime;
      for (const [f, d] of [
        [1568, 0],
        [1175, 0.09],
      ]) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(f, t + d);
        o.frequency.exponentialRampToValueAtTime(f * 0.75, t + d + 0.4);
        const g = ctx.createGain();
        env(g, t + d, 0.22, 0.008, 0.55);
        o.connect(g);
        g.connect(out);
        g.connect(echo);
        o.start(t + d);
        o.stop(t + d + 0.7);
      }
    },

    /** signal travelling: filtered noise sweep (down = satellite to ground) */
    whoosh(up: boolean, dur = 0.7) {
      if (!live()) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 3;
      bp.frequency.setValueAtTime(up ? 400 : 3200, t);
      bp.frequency.exponentialRampToValueAtTime(up ? 3600 : 350, t + dur);
      const g = ctx.createGain();
      env(g, t, 0.18, dur * 0.6, dur * 0.5);
      src.connect(bp).connect(g).connect(out);
      src.start(t);
      src.stop(t + dur + 0.6);
    },

    /** teleport receives: low impact */
    thump() {
      if (!live()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
      const g = ctx.createGain();
      env(g, t, 0.55, 0.005, 0.6);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.8);
    },

    /** link established / logo: warm chord */
    chime() {
      if (!live()) return;
      const t = ctx.currentTime;
      [440, 554.37, 659.25, 880, 1318.5].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i < 3 ? "triangle" : "sine";
        o.frequency.value = f;
        o.detune.value = (Math.random() - 0.5) * 8;
        const g = ctx.createGain();
        env(g, t + i * 0.035, i < 3 ? 0.09 : 0.05, 0.03, 2.4);
        o.connect(g);
        g.connect(out);
        g.connect(echo);
        o.start(t + i * 0.035);
        o.stop(t + 3);
      });
    },

    /** satellite acknowledges: two short rising beeps ("OK") */
    ack() {
      if (!live()) return;
      const t = ctx.currentTime;
      [
        [1046.5, 0],
        [1568, 0.11],
      ].forEach(([f, d]) => {
        const o = ctx.createOscillator();
        o.type = "square";
        o.frequency.value = f;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 2600;
        const g = ctx.createGain();
        env(g, t + d, 0.07, 0.004, 0.12);
        o.connect(lp).connect(g);
        g.connect(out);
        g.connect(echo);
        o.start(t + d);
        o.stop(t + d + 0.2);
      });
    },

    /** satellite turning into the logo: rising shimmer */
    swell() {
      if (!live()) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 6;
      bp.frequency.setValueAtTime(600, t);
      bp.frequency.exponentialRampToValueAtTime(5200, t + 0.9);
      const g = ctx.createGain();
      env(g, t, 0.12, 0.7, 0.35);
      src.connect(bp).connect(g).connect(out);
      src.start(t);
      src.stop(t + 1.2);
    },

    dispose() {
      pad?.stop();
      window.setTimeout(() => ctx.close().catch(() => {}), 1500);
    },
  };
}

export type Sfx = NonNullable<ReturnType<typeof createSfx>>;
