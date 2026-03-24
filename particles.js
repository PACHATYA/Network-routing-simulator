particlesJS("particles-js", {
  "particles": {
    "number": { "value": 90, "density": { "enable": true, "value_area": 800 } },
    "color": { "value": "#00f2ff" },
    "shape": { "type": "circle" },
    "opacity": { "value": 0.5, "random": true },
    "size": { "value": 2, "random": true },
    "line_linked": {
      "enable": true,
      "distance": 150,
      "color": "#00f2ff",
      "opacity": 0.1,
      "width": 1
    },
    "move": { "enable": true, "speed": 1, "out_mode": "out" }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": { "enable": true, "mode": "grab" },
      "onclick": { "enable": true, "mode": "push" }
    },
    "modes": {
      "grab": { "distance": 250, "line_linked": { "opacity": 0.5 } }
    }
  },
  "retina_detect": true
});