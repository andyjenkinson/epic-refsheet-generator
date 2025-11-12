const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('YAML Lists - Weapon Validation', () => {
    const listsDir = path.join(__dirname, '../lists/v1.5');
    let yamlFiles = [];

    beforeAll(() => {
        yamlFiles = fs.readdirSync(listsDir)
            .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
            .filter(file => file.startsWith('weapons'))
            .map(file => ({
                name: file,
                path: path.join(listsDir, file),
                content: yaml.load(fs.readFileSync(path.join(listsDir, file), 'utf8'))
            }));
    });

    test('should not have duplicate weapon IDs within a file', () => {
        yamlFiles.forEach(file => {
            const weapons = file.content.weapons || [];
            const ids = weapons.map(w => w.id);
            const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
            expect(duplicateIds).toEqual([]);
        });
    });

    test('should not have duplicate weapon names within a file', () => {
        yamlFiles.forEach(file => {
            const weapons = file.content.weapons || [];
            const names = weapons.map(w => w.name);
            const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
            expect(duplicateNames).toEqual([]);
        });
    });

    test('should not have missing parent weapons within a file', () => {
        yamlFiles.forEach(file => {
            const weapons = file.content.weapons || [];
            const children = weapons.filter(weapon => weapon.parent);
            const weaponMap = new Map(weapons.map(i => [i.id, i]));
            
            children.forEach(child => {
                expect(weaponMap.keys()).toContain(child.parent)
            });
        });
    });

    test('should not have weapons with parents that themselves have parents', () => {
        yamlFiles.forEach(file => {
            const weapons = file.content.weapons || [];
            const children = weapons.filter(weapon => weapon.parent);
            const weaponMap = new Map(weapons.map(i => [i.id, i]));
            
            children.forEach(child => {
                const parent = weaponMap.get(child.parent);
                
                if (parent) {
                    expect(parent.parent).not.toBeDefined()
                }
            });
        });
    });

    test('should not have duplicate weapons with different IDs or names', () => {
        yamlFiles.forEach(file => {
            const weapons = file.content.weapons || [];
            
            for (let i = 0; i < weapons.length; i++) {
                for (let j = i + 1; j < weapons.length; j++) {
                    const weapon1 = { ...weapons[i] };
                    const weapon2 = { ...weapons[j] };
                    
                    weapon1.id1 = weapon1.id;
                    weapon1.id2 = weapon2.id;
                    weapon2.id1 = weapon1.id;
                    weapon2.id2 = weapon2.id;
                    delete weapon1.id;
                    delete weapon1.name;
                    delete weapon2.id;
                    delete weapon2.name;

                    [weapon1,weapon2].forEach(w => {
                        if (w.profiles) {
                                w.profiles.forEach(p => {
                                    ['dice','AP','hit'].forEach(key => {
                                        if (p[key] == 0 || p[key] == '-') {
                                            delete p[key];
                                        }
                                    });
                                    if (p.notes) p.notes = p.notes.sort();
                                });
                        }
                    });

                    // Compare weapon contents
                    
                    const content1 = JSON.stringify(weapon1);
                    const content2 = JSON.stringify(weapon2);

                    if (weapon1.parent && weapon2.parent && weapon1.parent == weapon2.parent) {
                        //
                    } else {
                        //expect(content1).not.toEqual(content2);
                        expect(weapon1).not.toEqual(weapon2);
                    }
                    
                }
            }
        });
    });
});