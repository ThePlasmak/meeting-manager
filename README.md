# Meeting Manager

From an agenda written in Markdown, create a simple slide deck with timers based on each agenda item's duration.

## Setup

Just clone or download the entire repo.

## Usage

1. Write an agenda in Markdown like this:

    ```md
    # Weekly Meeting

    **Start Time:** 1 PM

    **Meeting Admins**
    - **Meeting Master:** Sarah
    - **Notetaker:** Solomon

    **Agenda**
    1. Opening context (Sarah) - 2 min
    2. Check-in (Sarah, Teck Lee, Solomon) - 1.5 min max per person
    ```

2. Open `meeting-manager.html` (the Meeting Manager app) with a browser.

3. Paste the Markdown into the app.

4. Optionally, click on the clock icon to add the clock times for each agenda item, so you can share them with others

5. Screenshare the app and run your meeting—with titles and timers automatically loaded from your agenda

## Publish

To update the hosted copy on `sarahmakmq.com`, run:

```powershell
.\publish.ps1
```

The script copies the current local app into the website repo at `C:\Users\Sarah\Documents\GitHub\personal-site\static\meeting-manager\`, commits that path, then pushes it to GitHub, so Cloudflare Pages can deploy it.
