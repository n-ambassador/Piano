// Piano functionality
class Piano {
    constructor() {
        this.audioContext = null;
        this.oscillators = {};
        this.gainNode = null;
        this.volume = 0.5;
        this.octave = 4;
        this.waveform = 'sine';
        
        this.initAudio();
        this.bindEvents();
        this.setupControls();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.gainNode.gain.value = this.volume;
        } catch (error) {
            console.error('Audio context not supported:', error);
        }
    }
    
    // Note frequencies (A4 = 440Hz)
    getNoteFrequency(note) {
        const noteFrequencies = {
            'C': 261.63,
            'C#': 277.18,
            'D': 293.66,
            'D#': 311.13,
            'E': 329.63,
            'F': 349.23,
            'F#': 369.99,
            'G': 392.00,
            'G#': 415.30,
            'A': 440.00,
            'A#': 466.16,
            'B': 493.88
        };
        
        const noteName = note.replace(/\d/, '');
        const octaveNum = parseInt(note.match(/\d/)[0]);
        
        const baseFreq = noteFrequencies[noteName];
        const octaveMultiplier = Math.pow(2, octaveNum - 4);
        
        return baseFreq * octaveMultiplier;
    }
    
    playNote(note) {
        if (!this.audioContext) return;
        
        // Resume audio context if suspended (required by browser policies)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        const frequency = this.getNoteFrequency(note);
        
        // Stop existing oscillator for this note
        if (this.oscillators[note]) {
            this.stopNote(note);
        }
        
        // Create new oscillator
        const oscillator = this.audioContext.createOscillator();
        const noteGain = this.audioContext.createGain();
        
        oscillator.type = this.waveform;
        oscillator.frequency.value = frequency;
        
        // Envelope for smooth attack and release
        noteGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        noteGain.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 0.01);
        
        oscillator.connect(noteGain);
        noteGain.connect(this.gainNode);
        
        oscillator.start();
        
        this.oscillators[note] = { oscillator, gainNode: noteGain };
        
        // Update UI
        this.updateCurrentNote(note);
    }
    
    stopNote(note) {
        if (this.oscillators[note]) {
            const { oscillator, gainNode } = this.oscillators[note];
            
            // Smooth release
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
            
            setTimeout(() => {
                try {
                    oscillator.stop();
                } catch (e) {
                    // Oscillator already stopped
                }
                delete this.oscillators[note];
            }, 100);
        }
    }
    
    updateCurrentNote(note) {
        const currentNoteElement = document.getElementById('currentNote');
        currentNoteElement.textContent = `演奏中: ${note}`;
        
        setTimeout(() => {
            if (currentNoteElement.textContent === `演奏中: ${note}`) {
                currentNoteElement.textContent = '押されたキー: なし';
            }
        }, 500);
    }
    
    bindEvents() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return; // Prevent key repeat
            
            const key = e.key.toLowerCase();
            const keyElement = document.querySelector(`[data-key="${key}"]`);
            
            if (keyElement) {
                e.preventDefault();
                const note = keyElement.dataset.note;
                this.playNote(note);
                keyElement.classList.add('active');
            }
        });
        
        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            const keyElement = document.querySelector(`[data-key="${key}"]`);
            
            if (keyElement) {
                const note = keyElement.dataset.note;
                this.stopNote(note);
                keyElement.classList.remove('active');
            }
        });
        
        // Mouse/touch events
        document.querySelectorAll('.key').forEach(key => {
            const note = key.dataset.note;
            
            key.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.playNote(note);
                key.classList.add('active');
            });
            
            key.addEventListener('mouseup', () => {
                this.stopNote(note);
                key.classList.remove('active');
            });
            
            key.addEventListener('mouseleave', () => {
                this.stopNote(note);
                key.classList.remove('active');
            });
            
            // Touch events for mobile
            key.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.playNote(note);
                key.classList.add('active');
            });
            
            key.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.stopNote(note);
                key.classList.remove('active');
            });
        });
    }
    
    setupControls() {
        // Volume control
        const volumeSlider = document.getElementById('volume');
        const volumeValue = document.getElementById('volumeValue');
        
        volumeSlider.addEventListener('input', (e) => {
            this.volume = e.target.value / 100;
            volumeValue.textContent = e.target.value;
            if (this.gainNode) {
                this.gainNode.gain.value = this.volume;
            }
        });
        
        // Octave control
        const octaveSelect = document.getElementById('octave');
        octaveSelect.addEventListener('change', (e) => {
            const newOctave = parseInt(e.target.value);
            this.updateOctave(newOctave);
        });
        
        // Waveform control
        const waveformSelect = document.getElementById('waveform');
        waveformSelect.addEventListener('change', (e) => {
            this.waveform = e.target.value;
        });
    }
    
    updateOctave(newOctave) {
        this.octave = newOctave;
        
        // Update all key notes
        document.querySelectorAll('.key').forEach(key => {
            const currentNote = key.dataset.note;
            const noteName = currentNote.replace(/\d/, '');
            
            // Map keys to their relative octave positions
            const keyMappings = {
                'a': 0, 'w': 0, 's': 0, 'e': 0, 'd': 0,
                'f': 0, 't': 0, 'g': 0, 'y': 0, 'h': 0, 'u': 0, 'j': 0,
                'k': 1, 'o': 1, 'l': 1, 'p': 1
            };
            
            const keyChar = key.dataset.key;
            const octaveOffset = keyMappings[keyChar] || 0;
            const noteOctave = newOctave + octaveOffset;
            
            key.dataset.note = noteName + noteOctave;
            
            // Update note label
            const noteLabel = key.querySelector('.note-label');
            if (noteLabel) {
                noteLabel.textContent = noteName;
            }
        });
    }
}

// Initialize piano when page loads
document.addEventListener('DOMContentLoaded', () => {
    const piano = new Piano();
    
    // Add welcome message
    console.log('🎹 Piano loaded! Use keyboard keys A-L to play notes.');
    console.log('Use W, E, T, Y, U, O, P for black keys (sharps/flats).');
});

// Add some visual flair
document.addEventListener('DOMContentLoaded', () => {
    // Animate keys on load
    const keys = document.querySelectorAll('.key');
    keys.forEach((key, index) => {
        setTimeout(() => {
            key.style.transform = 'translateY(5px)';
            setTimeout(() => {
                key.style.transform = '';
            }, 100);
        }, index * 50);
    });
});

// Prevent context menu on long press (mobile)
document.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('key')) {
        e.preventDefault();
    }
});