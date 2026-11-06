# Blog cover photos

Put each post's cover photo in this folder, named exactly after the post's slug.
The build picks it up automatically. Until a photo is here, the Blogs pages show
a neutral placeholder for that post, so nothing appears broken.

| Post | File in this folder |
| --- | --- |
| How to find and apply for driver jobs on Driver Hub | `find-and-apply-for-driver-jobs.jpg` |
| Uploading your driving licence and documents on Driver Hub | `upload-driving-licence-and-documents.jpg` |
| How employers post a driver vacancy on Driver Hub | `post-a-driver-job-as-an-employer.jpg` |
| Install the Driver Hub app on your phone | `install-driver-hub-app-on-your-phone.jpg` |

All four files are here now (photorealistic Gemini pictures, 1600 x 900, made on
6 Nov 2026). To change a cover, replace its file under the same name, update
`coverAlt` for that post in `src/data/blogPosts.ts` so it describes the new
picture, then rebuild and redeploy.

- `.jpg` is best. `.jpeg`, `.png` and `.webp` also work.
- Use a 16:9 landscape picture, about 1600 x 900. Keep each file under about 300 KB
  (compress big PNGs first), because phones load these on mobile data.
- A new post needs a new slug in `src/data/blogPosts.ts` and a photo with the same name here.

## Picture prompts (Gemini / Nano Banana)

Use these to make a new or replacement cover. For each post, paste that post's
prompt and then the shared style line, so all covers match.

**Shared style line (add to every prompt):**

> Style: a photorealistic photograph that looks like a real camera photo, not a cartoon, illustration, 3D render or low-poly image. Natural soft daylight, true-to-life colours with a calm, slightly cool tone and touches of deep navy blue in clothing or surroundings, shallow depth of field, clean composition with the subject slightly off-centre. Indian setting in or around Bengaluru. 16:9 landscape, 1600x900. No text, captions, readable signs, number plates, watermarks or brand logos anywhere. The people are ordinary adults who do not resemble any real or famous person. Any phone or laptop screen is softly blurred with nothing readable.

**How to find and apply for driver jobs on Driver Hub** → `find-and-apply-for-driver-jobs.jpg`

> A friendly Indian truck driver in his mid-30s sits in the driver's seat of a parked commercial truck at a highway rest stop outside Bengaluru, looking down at a smartphone in his hand with a hopeful, focused expression. Morning sunlight comes in through the windscreen. He wears a plain navy-blue work shirt. Through the side window, a few other parked trucks and the highway are softly out of focus. The phone screen is blurred and unreadable.

**Uploading your driving licence and documents on Driver Hub** → `upload-driving-licence-and-documents.jpg`

> A close-up, over-the-shoulder shot of an Indian driver's hands holding a smartphone level above the dashboard of a parked car, taking a photo of a plain plastic ID card lying on a neat brown paper folder. A car key lies beside the folder. The card and the phone screen show no readable names, numbers or photos, only soft blurred shapes. Soft daylight falls through the windscreen, and the driver's navy shirt sleeve is visible at the edge of the frame.

**How employers post a driver vacancy on Driver Hub** → `post-a-driver-job-as-an-employer.jpg`

> An Indian fleet manager in her early 40s, wearing a navy blazer, sits at a tidy desk in a small transport company office in Bengaluru, typing on an open laptop with a calm, decisive look. Behind her, a large window looks onto a yard with a row of plain white delivery vans and a small goods truck parked in daylight. The laptop screen is turned away or blurred. A notebook and a cup of tea sit on the desk.

**Install the Driver Hub app on your phone** → `install-driver-hub-app-on-your-phone.jpg`

> An Indian cab driver in his late 20s stands beside a plain white hatchback on a quiet, tree-lined street in a Bengaluru residential area, smiling as he taps the home screen of his smartphone with his thumb. He wears a navy-blue uniform shirt. Morning daylight filters through the trees. The car has no logo, badge or visible number plate, and the phone screen shows only blurred app icons with nothing readable.
