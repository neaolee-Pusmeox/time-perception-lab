# Portraits Prompt Pack — Time Perception Lab

Nine front-facing black-and-white portraits for the nine "time personality" characters in the result page. Each prompt is engineered to be drop-in interchangeable: identical framing, identical lighting, identical tonal range, identical aspect ratio. The only variable is the subject's face and historically-accurate attire.

## Output Spec (all 9 files must match exactly)

| Spec | Value |
|---|---|
| Resolution | **1024 × 1024 px** (square, fits the circular `portrait-disc`) |
| Color | Pure monochrome black & white, **no sepia, no color cast** |
| Format | PNG, transparent background **not** required (solid mid-grey is fine) |
| File name | `napoleon.jpg`, `tesla.jpg`, `picasso.jpg`, `kant.jpg`, `zhuge.jpg`, `mozart.jpg`, `darwin.jpg`, `murakami.jpg`, `libai.jpg` (saved as `.jpg` to match `app.js` references; the source can be PNG but export as JPG quality 92) |
| Framing | Centered head-and-shoulders bust, eyes at ~38% from top |
| Background | Plain neutral mid-grey `#9a9a9a`, lightly textured paper grain, no objects |
| Lighting | Soft single key light from upper-left at 30°, gentle fill, no harsh shadows |
| Style anchor | Editorial magazine portrait, 1960s *LIFE* / *Magnum* black-and-white film aesthetic, grain present but restrained |

## Reference-fidelity policy

- **With photographic record** (Napoleon → painting only / Tesla, Darwin, Murakami → photos exist): prompts include explicit likeness anchors so the subject is recognizable.
- **Without photographic record** (Kant → 18th c. portraits; Picasso, Mozart → both painting + photo; Zhuge Liang, Li Bai → only traditional Chinese painting iconography): prompts lean on the most widely accepted visual archetype so the audience recognizes them at a glance.

## Universal style block (already embedded in every prompt below)

> Editorial black-and-white portrait, 1024x1024 square crop, head-and-shoulders bust, frontal pose, eyes looking directly at the camera, neutral mid-grey #9a9a9a background with subtle paper grain, soft directional key light from upper-left at 30 degrees, gentle fill, no harsh shadows, restrained film grain, magazine portrait style reminiscent of mid-century LIFE photography, deep tonal range, sharp focus on the eyes, no color tint, no sepia, no logos, no text, no border.

## Negative prompt (apply to all 9)

> color, sepia, blurry, low resolution, cartoon, anime, 3d render, plastic skin, double face, asymmetric eyes, text, watermark, signature, frame, border, modern clothing (unless subject is modern), smartphone, screen, decorative props.

## File index

| No. | Subject | File | Source basis |
|---|---|---|---|
| 01 | Napoleon Bonaparte (拿破仑) | `napoleon.txt` | Jacques-Louis David / Ingres portraits |
| 02 | Nikola Tesla (特斯拉) | `tesla.txt` | 1890s studio photographs (Sarony) |
| 03 | Pablo Picasso (毕加索) | `picasso.txt` | mid-century photographs (Brassaï, Capa) |
| 04 | Immanuel Kant (康德) | `kant.txt` | 18th c. Königsberg portraits |
| 05 | Zhuge Liang (诸葛亮) | `zhuge.txt` | traditional Chinese iconography |
| 06 | Wolfgang Amadeus Mozart (莫扎特) | `mozart.txt` | Lange / Croce portraits |
| 07 | Charles Darwin (达尔文) | `darwin.txt` | 1860s–80s photographs (Maull & Polyblank) |
| 08 | Haruki Murakami (村上春树) | `murakami.txt` | well-known author press photos |
| 09 | Li Bai (李白) | `libai.txt` | Tang dynasty literati iconography (Liang Kai) |

## How to use

1. Open the `.txt` file for the subject you want to generate.
2. Copy the **entire prompt** (it already includes the universal style block).
3. Paste into your image generator (Midjourney `/imagine`, Stable Diffusion, DALL·E, Flux, etc.).
4. Use the negative prompt above where the tool supports it.
5. Save the output to this folder with the exact filename in the index table.

For Midjourney users, append `--ar 1:1 --style raw --stylize 100` to keep the photographic feel.
For Stable Diffusion / Flux users, use sampler DPM++ 2M Karras, CFG 4–6, 30 steps.