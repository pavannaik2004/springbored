# <img src="icon128.png" alt="" width="32" height="32"> Springbored

_For when the course is 4 hours long and your attention span is 4 seconds._

A Chrome/Edge extension for Infosys Springboard (`infyspringboard.onwingspan.com`). On each video it:

1. jumps to the last 5 seconds (you can change how many),
2. lets the video play to the end so the platform records it as finished (it has to _see_ you finish — it's needy like that), and
3. clicks **Next** to open the next item in the course.

You go make chai. Springbored does the watching.

## Install

**[⬇ Download Springbored.zip](https://github.com/pavannaik2004/springbored/releases/download/new/Springbored.zip)** from the [latest release](https://github.com/pavannaik2004/springbored/releases/tag/new).

1. Unzip it into a folder and keep it somewhere you won't "clean up" next week. Chrome loads the extension from this folder, so if you delete it the extension goes with it.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode** (top-right). You're a developer now. Congratulations.
4. Click **Load unpacked** and pick the unzipped folder, the one with `manifest.json` directly inside it.
5. Pin the icon (the blue-and-orange ▶▶) to your toolbar so you can find it again.

## Use

1. Open a course video on Springboard.
2. Click the extension icon and press the big blue **▶ Start skipping** button. The page reloads and the skipping begins.
3. Press the orange **■ Stop skipping** button when you've had enough. It stops right away, no reload.

A small ⏭ label in the bottom-left corner of the page shows what the extension is up to, so you can check on it between sips.

## Settings

| Setting                      | Default | Notes                                                                                                                |
| ---------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| How to skip                  | Jump    | Switch to **16x speed** if jumped videos aren't getting marked complete. Some players are suspicious of time travel. |
| Play the last                | 5s      | Anywhere from 1 to 60 seconds.                                                                                       |
| Open the next item when done | on      | Turn off if you want to be asked before every episode, Netflix-style.                                                |

## Updating

Download the new zip, unzip it over the old folder, then hit the ↻ reload button on the extension's card in `chrome://extensions`.

## Notes

- The extension loads on every site so it can reach video players tucked inside iframes. On any page that isn't Springboard it stops straight away and does nothing. It's not interested in your other tabs.
- It only handles HTML5 `<video>` players. When the next item is a PDF, a quiz or a web page, it stops and you continue by hand. Quizzes are still your problem.
- If the label says "Could not find the Next button", right-click the Next arrow, choose **Inspect**, and share the HTML in an issue so the button detection can be fixed.
