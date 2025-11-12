import json
import yaml
from pathlib import Path
import re
import sys


# Define a custom YAML dumper to control indentation of sequences
class MyDumper(yaml.Dumper):

    def increase_indent(self, flow=False, indentless=False):
        return super(MyDumper, self).increase_indent(flow, False)

def convert_legion_builder_to_yaml(input_file, output_file):
    """Convert Legion Builder unitData to YAML format."""
    
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    # Extract UNIT_DATASHEET
    unit_datasheet = data.get('UNIT_DATASHEET', [])

    # Extract UNIT_DATASHEET
    weapon_datasheet = data.get('WEAPON_DATASHEET', [])
    
    # Transform to target YAML format
    units = transform_datasheet(unit_datasheet, weapon_datasheet)
    
    with open(output_file, 'w') as f:
        yaml.dump(units, f, Dumper=MyDumper, default_flow_style=False, sort_keys=False)

def transform_datasheet(lb_units, lb_weapons):
    """Transform Legion Builder format to ref sheet object structure."""

    datasheet = {
        'units': {
            #'Solar Auxilia': {
            #    'Infantry': [],
            #    ... 
            #}
        },
        'weapons': []
    }

    weapons = {}
    for lb_weapon in lb_weapons:
        weapon = convert_weapon(lb_weapon)
        weapons[lb_weapon['id']] = weapon
        datasheet['weapons'].append(weapon)
    
    for lb_unit in lb_units:
        faction, unit_type, unit = convert_unit(lb_unit, weapons)

        if faction not in datasheet['units']:
            datasheet['units'][faction] = {}

        if (unit_type not in datasheet['units'][faction]):
            datasheet['units'][faction][unit_type] = []
        
        datasheet['units'][faction][unit_type].append(unit)

    return datasheet

def convert_weapon(lb_weapon):
    weapon = {}
    weapon['id'] = kebab_case(lb_weapon.get('name'))
    weapon['name'] = lb_weapon.get('name')
    weapon['profiles'] = []

    if lb_weapon.get('profiles') is not None and len(lb_weapon.get('profiles')) > 0:
        for lb_profile in lb_weapon.get('profiles'):

            profile = {}
            weapon['profiles'].append(profile)

            if lb_profile.get('range') is not None:
                profile['range'] = lb_profile.get('range') 
            if lb_profile.get('dice') is not None:
                profile['dice'] = lb_profile.get('dice')
            if lb_profile.get('to_hit') is not None:
                profile['hit'] = lb_profile.get('to_hit')
            if lb_profile.get('ap') is not None:
                profile['AP'] = lb_profile.get('ap') * -1

            if lb_profile.get('traits') is not None and len(lb_profile.get('traits')) > 0:
                profile['notes'] = []

                for trait in lb_profile.get('traits'):
                    note = trait['name']
                    if 'value' in trait:
                        if trait['value'] is None:
                            print(f"Warning: special rule '{note}' has null value in weapon '{weapon['name']}'")
                        else:
                            note += f" ({trait['value']})"
                    note = title_case(note)

                    if note == 'Antitank':
                        note = 'Anti-tank'

                    profile['notes'].append(note)

    return weapon

def convert_unit(lb_unit, weapons):

    COPY = ['name', 'morale', 'save', 'wounds']
    MAP = {
        'movement': 'move',
        'caf': 'CAF',
    }

    """Convert a single unit from Legion Builder format to ref sheet format."""
    unit = {}
    # Add the properties in the right order, starting with 'id'
    unit['id'] = kebab_case(lb_unit['name']) or None
    for key in ['id', 'name', 'move', 'save', 'CAF', 'morale', 'wounds']:
        if key in lb_unit and lb_unit[key] is not None:
            if key in COPY:
                unit[key] = lb_unit.get(key)
            elif key in MAP:
                unit[MAP[key]] = lb_unit.get(key)
    
    if 'move' in unit:
        if unit['move'] == '-':
            unit.pop('move')
        else:
            unit['move'] = int(unit['move'].strip("\"")) # don't want the inches symbol on the end


    unit_type = lb_unit.get('unit_type').get('type')
    match unit_type:
        case 'infantry' | 'UNIT_TYPE.infantry':
            unit_type = 'Infantry'
        case 'cavalry' | 'UNIT_TYPE.cavalry':
            unit_type = 'Cavalry'
        case 'walker' | 'UNIT_TYPE.walker':
            unit_type = 'Walker'
        case 'vehicle' | 'UNIT_TYPE.vehicle':
            unit_type = 'Vehicle'
        case 'heavy' | 'UNIT_TYPE.heavy':
            unit_type = 'Vehicle'

    if 'special_rules' in lb_unit and len(lb_unit['special_rules']) > 0:
        unit['notes'] = []
        for sr in lb_unit['special_rules']:
            note = sr.get('name')
            if note:
                if note.startswith('SpecialRule.'):
                    note = note[len('SpecialRule.'):]
                
                note = title_case(note)
            if 'value' in sr:
                if sr['value'] is None:
                    print(f"Warning: special rule '{note}' has null value in unit '{unit['name']}'")
                else:
                    note += f" ({sr['value']})"
            unit['notes'].append(note)

            # We (for better or worse) treat flyers as a separate unit type
            if (note == 'Flyer'):
                unit_type = 'Aircraft'

    
    if unit['name'] == 'Thunderbolt Fighter':
        print(unit_type, unit['notes'])

    # Map weapons
    if 'weapons' in lb_unit and len(lb_unit['weapons']) > 0:
        unit['weapons'] = []
        for lb_weapon in lb_unit['weapons']:
            # Weapon in the unit struct is just an ID reference
            weapon = weapons[lb_weapon]
            unit['weapons'].append(weapon['id'])

    return lb_unit['faction'], unit_type, unit

def title_case(note):
    # Convert camelCase / PascalCase / snake_case to Title Case
    #print('1', note)
    note = re.sub(r'[_]+', ' ', note)
    #print('2', note)
    note = re.sub(r'(?<=[a-z0-9])(?=[A-Z])', ' ', note)
    #print('3', note)
    note = re.sub(r'(?<=[A-Z])(?=[A-Z][a-z])', ' ', note)
    #print('4', note)
    note = ' '.join(determine_case(word) for word in note.split())
    #print('5', note)
    return note

def determine_case(word):
    if (word.lower() in ['of', 'and', 'in', 'the', 'to', 'for', 'on', 'by', 'is', 'a', 'an']):
        return word.lower()
    elif len(word) <= 2:
        return word.upper()
    else:
        return word.capitalize()

def kebab_case(name):
    """Convert a string to kebab-case."""
    name_val = name or ''
    kebab = re.sub(r'-{2,}', '-', re.sub(r'[^a-z0-9\-]', '', re.sub(r'[\s_]+', '-', name_val.lower())))
    return kebab.strip('-')

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python convert-legion-builder.py <input_file> <output_file>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    convert_legion_builder_to_yaml(input_file, output_file)