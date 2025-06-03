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