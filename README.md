# GraphSteer: Scene-Graph Steering for Video Diffusion Models

**Leonardo Stoppani, Donald Shenaj, Davide Bacciu** — University of Pisa

🌐 **Project page:** https://lilf4p.github.io/graphsteer/  
📄 **Paper:** arXiv link coming soon

> **Code will be released soon.** This repository currently hosts only the project website.

GraphSteer is a plug-and-play, layout-free method that steers frozen text-to-video diffusion models towards every spatial relation in the prompt. The prompt is parsed into a scene graph, a Graph Scorer Module scores every relation directly from cross-attention, and a single joint loss over the graph guides the latent during the first denoising steps. No layouts, no retraining, and zero-shot transfer across video backbones (CogVideoX, Wan2.x, HunyuanVideo).

## Citation

```bibtex
@article{stoppani2026graphsteer,
  title   = {GraphSteer: Scene-Graph Steering for Video Diffusion Models},
  author  = {Stoppani, Leonardo and Shenaj, Donald and Bacciu, Davide},
  journal = {arXiv preprint arXiv:XXXX.XXXXX},
  year    = {2026}
}
```

## Website

The site is static (`index.html`, `static/`) and served with GitHub Pages from the `main` branch.
To swap the frame sequences for real videos, add `video: { base: "...mp4", ours: "...mp4" }` to a clip in `static/js/main.js`.
