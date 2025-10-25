# Legions Imperialis data files

## Build process

Files are authored in YAML, then converted to JSON for ease of use in the Javascript list builder.

Windows, Mac & Linux:

> python yaml-to-json.py < foo.yaml > foo.json

## YAML structure

The YAML data is at present one big file, organised like this:

```YAML
units:
  Legiones Astartes:
    Infantry:
      - id: la-assault
        name: Legion Assault
        move: 7
        save: 5
        CAF: 3
        morale: 3
        notes:
          - Jump Packs
          - Independent
        weapons:
          - id: bolt-pistols
weapons:
  - id: bolt-pistols
    name: Bolt pistols
    profiles:
      - range: 6
        dice: 1
        hit: 5
        notes:
          - Light
```

Weapons can have multiple profiles, and units can have multiple weapon options by specifying minimum and maximum choices for a given mounting. Look at the existing data e.g. Titans for examples. This allows the specific variant of a model to be selected in the list, with a unique entry in the reference list for that variant instead of including profiles for all the other weapons.

## TODO

Currently does not support formation and detachment structures - units are added manually. May never implement this as Legion Builder does a good job. Rather implement a mechanism to generate a ref sheet from a Legion Builder list.

v1.1 Liber Strategia

 * All additions for v1.0
 * Add Vindicator
 * Add Whirlwind
 * Add Scorpius
 * Add Cerberus
 * Add Typhon
 * Add Mastodon
 * Check Knight weapons for changes

v1.0 Original rulebook + expansion books:

 * Add Dire wolf titan
 * Add Warbringer Nemesis titan
 * Add Knight Acastus Porphyrion
 * Add Knight Asterius
 * Add Knight Armiger
 * Add Solar Auxilia
 * Add Mechanicum
 * Add Dark Mechanicum
