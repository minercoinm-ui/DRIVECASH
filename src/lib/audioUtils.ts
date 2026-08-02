// Web Audio Synthesizer & Audio Alert Management System for DriveCash

let rideAlertIntervalId: any = null;
let activeAudioContext: AudioContext | null = null;

export function stopRideAlert() {
  if (rideAlertIntervalId) {
    clearInterval(rideAlertIntervalId);
    clearTimeout(rideAlertIntervalId);
    rideAlertIntervalId = null;
  }
  if (activeAudioContext) {
    try {
      activeAudioContext.close();
    } catch (e) {
      // ignore
    }
    activeAudioContext = null;
  }
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(0);
    } catch (e) {}
  }
}

function playSingleChimePulse() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    activeAudioContext = ctx;

    // Pleasant Uber/99 style dual-tone chime (F#5 to C#6)
    const notes = [
      { freq: 739.99, time: 0, duration: 0.18 },   // F#5
      { freq: 1108.73, time: 0.12, duration: 0.28 } // C#6
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

      gain.gain.setValueAtTime(0, ctx.currentTime + note.time);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + note.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + note.time);
      osc.stop(ctx.currentTime + note.time + note.duration);
    });
  } catch (e) {
    console.log("[AUDIO ALERT NOTICE] Audio playback ignored:", e);
  }
}

/**
 * Plays a modern Uber/99 style audio chime & vibration alert.
 * Repeats every 1000ms (1 second) continuously for up to 15 seconds or until stopRideAlert() is called.
 */
export function playRideAlert() {
  stopRideAlert();

  // Helper to trigger vibration
  const triggerVibration = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([300, 200, 300, 200, 300]);
      } catch (e) {}
    }
  };

  // Browser background notification fallback
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted" && document.hidden) {
      try {
        new Notification("🚕 Nova Corrida Disponível!", {
          body: "Uma nova solicitação de corrida acabou de chegar no DriveCash.",
          icon: "/favicon.ico"
        });
      } catch (e) {}
    } else if (Notification.permission === "default") {
      try {
        Notification.requestPermission();
      } catch (e) {}
    }
  }

  // Initial immediate pulse (Tick 1)
  playSingleChimePulse();
  triggerVibration();

  let tickCount = 1;
  const maxTicks = 15; // 15 seconds total

  rideAlertIntervalId = setInterval(() => {
    tickCount++;
    if (tickCount > maxTicks) {
      stopRideAlert();
      return;
    }
    playSingleChimePulse();
    triggerVibration();
  }, 1000); // 1 second loop
}

// Backwards compatibility export alias
export const playRideAlertSound = playRideAlert;

export function playSuccessChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.log("Success chime ignored", e);
  }
}

