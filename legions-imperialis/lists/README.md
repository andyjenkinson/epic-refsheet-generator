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

### Multiple of a weapon

You can define that a unit has more than one of a given weapon using the `number` property:

```YAML
      - id: warmaster
        name: Warmaster Titan
        weapons:
          - id: plasma-destructor
            number: 2
```

### Weapon options

It is possible to define weapon mounting point choices, in various combinations:

 - Optional weapons
 - Choose one of a given list of weapons
 - Choose two from a list of weapons
 - Choose between X and Y from a list of weapons

The most common configuration (choose one from a list of weapons) can be implemented with minimal set of properties, due to some defaults:

 - If `min` and `max` are not specified, both are assumed to be 1
 - If only `min` is specified, `max` is assumed to be the same

 Example 1: three weapon mounting points, with the turret and sponsons both having a choice of two options

 ```YAML
weapons:
  - id: hull-heavy-bolter
  - options:
      - id: accelerator-autocannon
      - id: omega-plasma-array
  - options:
      - id: heavy-bolter-sponsons
      - id: lascannon-sponsons
```

Example 2: optional additional weapon

 ```YAML
weapons:
  - min: 0
    max: 1
    options:
      - id: pintle-heavy-bolter
```

Example 3: choose any two from a list of weapons

 ```YAML
weapons:
  - min: 2
    max: 2
    options:
      - id: vulcan-mega-bolter
      - id: turbo-laser-destructor
      - id: plasma-blastgun
      - id: inferno-gun
      - id: incisor-melta-lance
      - id: volkite-eradicator
      - id: shudder-missiles
      - id: swarmer-missiles
      - id: ursus-claw
      - id: natrix-shock-lance
      - id: graviton-eradicator
      - id: conversion-beam-dissolutor
```

*Note:* The default option for a given choice is the first weapon in the list.

### Parent-child inheritance

Both units and weapons can be defined by overriding properties of a parent unit/weapon. Note that if a property is defined for the child it *replaces* the equivalent property in the parent. This means for example you must define all of a unit's weapons if you want to modify one.

Example 1: define a new unit, changing the CAF, Morale and special abilities:

```YAML
- id: kratos-commander
  parent: kratos
  name: Kratos Commander
  CAF: 4
  morale: 2
  notes:
    - Commander
    - Inspire (8")
    - Invulnerable Save (6+)
    - Master Tactician (6")
```

Example 2: define a new weapon, changing only the name:

```YAML
- id: pintle-multi-melta
  parent: multi-melta
  name: Pintle multi-melta
```

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

 * Add Warbringer Nemesis titan
 * Add Knight Acastus Porphyrion
 * Add Knight Asterius
 * Add Knight Armiger
 * Add Solar Auxilia
 * Add Mechanicum
 * Add Dark Mechanicum
