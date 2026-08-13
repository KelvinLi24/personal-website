# Source photos

Put the original photos for each portfolio post in the matching folder here.

Use simple numeric filenames to control order:

- `1.jpg`
- `2.jpg`
- `3.jpg`

JPEG, PNG, WebP, AVIF, GIF and TIFF inputs are accepted. Upper-case extensions also work.

The website does **not** load these originals directly. Run `prepare-images.bat` locally, or push them to GitHub and let the Pages workflow build optimized WebP variants, low-quality image placeholders and `images.json` manifests automatically.

Generated website images are written to `assets/`. Do not manually edit generated `*-640.webp`, `*-1280.webp` or `images.json` files.
