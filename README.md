# Springbored

A Chrome/Edge extension for Infosys Springboard (`infyspringboard.onwingspan.com`). On each video it:

1. jumps to the last 5 seconds (you can change how many),
2. lets the video play to the end so the platform records it as finished, and
3. clicks **Next** to open the next item in the course.

## Install

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Open a course video on Springboard, click the extension's toolbar icon, and press the big blue **▶ Start skipping** button. The page reloads and skipping begins.
5. Press the orange **■ Stop skipping** button to turn it off (takes effect immediately, no reload).

A small ⏭ status label in the bottom-left corner shows what the extension is doing.

## Settings (below the Start/Stop button)

| Setting | Default | Notes |
|---|---|---|
| Mode | Jump to end | Choose **Play at 16x** if jumped videos don't get marked as complete |
| Seconds to play at the end | 5 | |
| Go to next item automatically | on | |

## Notes

- The extension is loaded on every site so that it can reach a video player inside an iframe. On any page that isn't Springboard, it stops straight away and does nothing.
- Only HTML5 `<video>` players are handled. When the next item is a PDF, a quiz or a web page, the extension stops there and you continue by hand.
- If the label says "Could not find the Next button", right-click the Next arrow, choose **Inspect**, and share the HTML so the button detection can be fixed.
