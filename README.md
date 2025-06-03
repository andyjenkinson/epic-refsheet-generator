# Epic Reference Sheet Generator

A simple webapp for generating unit reference sheets for Epic-scale wargaming.

Originally developed several years ago for personal use with Epic Armageddon, I have adapted it
to work with Legions Imperialis armies. 

***THIS TOOL IS NOT an army builder***! I suggest to use the excellent [Legion Builder](https://legionbuilder.app/) for that.
The intended purpose of *this* tool is to generate a tailored 'quick reference sheet' for the stats of the units in your
army, as an alternative to army cards. It also produces a simple summary of your army for your opponent.

The tool relies on you manually selecting the models in your detachments - it does NOT enforce army building rules etc.

***Please note***: list data is incomplete! PRs welcome.

## Limitations

This status of this project is a barebones "enough to be functional for what I need". There are a lot of limitations!

 * Not all units are coded - only Astartes, Knights and Titans at present
 * Can only save and restore one list from the browser session - no logins etc
 * It's not beautiful
 * Doesn't work well on mobile

## Build & Run Locally

```console
docker build -t epic-refsheet .
docker compose up
```

Open a browser at <http://localhost:8080/>

Copyright 2025 [@andyjenkinson](https://github.com/andyjenkinson/)