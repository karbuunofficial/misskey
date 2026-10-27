# AMIXOF brand assets

`source/` holds the two official logo files exactly as supplied (2000x2000):

* `amixof-logo-light-original.webp` – coral-red artwork on a white canvas, for light surfaces
* `amixof-logo-dark-original.webp` – white artwork on a transparent canvas, for dark surfaces

`make-brand-assets.py` derives everything the app ships (it never redraws the artwork): the outer white canvas of the
light logo becomes transparent (letters enclosed by the artwork stay white), both variants are cropped to one shared
box so they keep the same scale, and the web / icon sizes are rendered.

| Output | Use |
| --- | --- |
| `packages/frontend/assets/amixof-logo-{light,dark}.webp` | in-app logo (`MkAmixofLogo.vue`) |
| `packages/backend/assets/favicon.ico`, `favicon.png` | browser tab icon, default instance icon |
| `packages/backend/assets/apple-touch-icon.png` (180) | iOS home screen (opaque white) |
| `packages/backend/assets/icons/192.png`, `512.png` | PWA maskable icons, default Open Graph image |
| `packages/backend/assets/splash.png` | loading screen / PWA splash |
| `packages/backend/assets/mi-white.png` | white mark used in e-mails |

Administrators can still override the icons and name in the control panel.
