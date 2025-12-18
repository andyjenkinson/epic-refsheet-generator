/**
 * Copyright 2013-2024 Andrew Jenkinson
 **/

var lists = [
  { version: 'v1.5', name: "Liber Strategia", filename: "v1.5/legions-imperialis-v1.5.1.json" },
  { version: 'v1.0', name: "Rulebook & expansions", filename: "v1.0/legions-imperialis-v1.0.json" },
];

var session = {
  'formations': [],
};
var cache = {
  'variants': {}
};

function changeArmy(listVersion) {
  console.log("Changing army to "+listVersion);
  var list;
  for (var i=0; i<lists.length; i++) {
    var tmp = lists[i];
    if (tmp.version == listVersion) {
      list = tmp;
      break;
    }
  }

  // Not a valid list for that source
  if (!list) {
    console.log("ERR: Not a valid list: "+listVersion);
    return;
  }
  
  console.log('Fetching '+list.filename);

  // Fetch the army list JSON file
  $.getJSON('lists/'+list.filename, function(data) {
    // save the data
    $("body").data("armyDef", data);
    cache['variants'] = {};
    console.log(data);

    createReferenceList();
    deleteAllDetachments();
    $('#buttons-block').show();

    // Update the editing forms with the units in the army

    // Set up detachment editor
    var detachmentEditForm = $('div#detachment-edit');
    var unitTypeTabs = detachmentEditForm.find('.tabs');
    unitTypeTabs.find('.tab').empty(); // remove all the existing buttons
    var unitTypeTabLinks = unitTypeTabs.find('li');
    unitTypeTabLinks.hide(); 
    var factionFilter = detachmentEditForm.find('select#faction-filter');
    factionFilter.find('option').not(':first').remove(); // remove all existing options except 'All'

    // A button for each unit is added within a tab based on that detachment's type
    $.each($('body').data('armyDef').units, function(faction, val) {

      // Add faction to filter dropdown
      factionFilter.append('<option value="'+faction+'">'+faction+'</option>');

      $.each(val, function(type, units) {

        var tab;
        switch (type) {
          case 'Infantry':
          case 'Cavalry':
          case 'Walker':
            tab = unitTypeTabs.find('#units-infantry');
            unitTypeTabLinks.slice(0,1).show();
            break;
          case 'Vehicle':
          case 'Super-heavy Vehicle':
            tab = unitTypeTabs.find('#units-vehicles');
            unitTypeTabLinks.slice(1,2).show();
            break;
          case 'Aircraft':
            tab = unitTypeTabs.find('#units-aircraft');
            unitTypeTabLinks.slice(2,3).show();
            break;
          case 'Knights':
          case 'Knight':
            tab = unitTypeTabs.find('#units-knights');
            unitTypeTabLinks.slice(3,4).show();
            break;
          case 'Titan':
          case 'Titans':
            tab = unitTypeTabs.find('#units-titans');
            unitTypeTabLinks.slice(4,5).show();
            break;
          default:
            console.log("Unrecognised type: "+type);
        }

        $.each(units, function(i, unit) {

          if (unit.parent) {
            var parent = getUnit(unit.parent);
            var merged = $.extend( {}, parent, unit ); // New object overriding the parent
            $.extend( unit, merged ); // Merge the properties into this object instance
          }

          var div = $('<div/>').attr('id','unit-'+unit.id);
          div.attr('data-faction', faction);
          var button = $('<button>'+unit.name+'</button>');
          button.button();
          div.append(button);

          if (!unit.weapons) {
            unit.weapons = [];
          }

          $.each(unit.weapons, function(j, weapon) {
            
            if (weapon.options) {
              
              if (typeof weapon.min === 'undefined' || weapon.min < 0) {
                weapon.min = 1;
              }
              if (typeof weapon.max === 'undefined' || weapon.max < weapon.min || weapon.max < 1) {
                weapon.max = weapon.min;
              }

              console.log('Adding options ('+weapon.min+' to '+weapon.max+')');
              for (var o=1;o<=weapon.max; o++) {
                var dropdown = $('<select/>').attr('name', 'unit-'+unit.id+'-option-'+o);
                if (o > weapon.min) {
                  dropdown.append("<option>---</option>");
                }
                for (var i=0;i<weapon.options.length; i++) {
                  var w = normaliseWeaponOption(weapon.options[i]);
                  console.log('Adding option for '+w.id);
                  var op = $('<option/>').attr('value', w.id).attr('label', w.name);
                  dropdown.append(op);
                }
                div.append(dropdown);
              }
            }
          });

          button.click(function() {
            var selected_options = $.makeArray(div.find('select option:selected'));//.map(function(){this.value});
            var option_ids = selected_options.map( function(o){ return o.value } );
            addUnitVariant(unit.id, unit.name, option_ids)
          });
          tab.append(div);
          //console.log("Added "+div.attr(id));
        });
      });
    });

    unitTypeTabs.tabs(); // Render as tabs
                
  });
  
}

function unitVariantId(unitId, optionIds) {
  return optionIds && optionIds.length > 0 ? [unitId, optionIds.join('|')].join('|') : unitId;
}

function getUnitVariant(unitId, optionIds) {

  var variantId = unitVariantId(unitId, optionIds);

  if (cache['variants'][unitId] && cache['variants'][unitId][variantId]) {
    return cache['variants'][unitId][variantId];
  }

  var unit = getUnit(unitId);

  // Create a new object for this unit variant
  var variant = $.extend(true, {}, unit); // Copy from the army definition
  variant.id = variantId;
  variant.weapons = []; // the actual weapons chosen for this unit variant
  var optionIndex = 0;

  // For each weapon mounting on the unit add the chosen weapon(s)
  $.each( unit.weapons, function(i, weaponMounting) {
    // If this weapon mounting is a standard weapon with no options, just add it
    if (!weaponMounting.options) {
      variant.weapons.push(normaliseWeaponOption(weaponMounting));
    }
    // If this weapon mounting has options, use the next option ID to choose
    else {
      for (var j=0; j<weaponMounting.max; j++, optionIndex++) {

        var optionId = optionIds[optionIndex];
        // If the option is not set (e.g. addon weapons with max > min), skip this weapon
        if (optionId == '---') {
          continue
        }

        // If we've seen this weapon before, just increment the number
        var weapon = variant.weapons.find((w) => w.id == optionId);
        if (weapon) {
          weapon.number += 1;
        } else {
          weapon = weaponMounting.options.find((w) => w.id = optionId);
          variant.weapons.push(normaliseWeaponOption(weapon));
        }
      }
    }
  });

  if (!cache['variants'][unitId]) {
    cache['variants'][unitId] = {}
  }
  if (!cache['variants'][unitId][variantId]) {
    cache['variants'][unitId][variantId] = variant;
  }
  
  return variant;
}

function getUnit(id) {
  var u;
  var unitStruct = $('body').data('armyDef').units;
  $.each( unitStruct, function(faction, val) {
    $.each( val, function(type, unitArray) {
      $.each( unitArray, function(i, unit) {
        if (unit.id == id) {
          u = unit;
          return;
        }
      });
    });
  });

  if (!u) {
    console.log("cannot find unit "+id);
    return null;
  }
  return u;
}

// Normalise an instance of a specific weapon (either ID or object) into an object
function normaliseWeaponOption(weapon) {
  if (typeof weapon === 'string') {
    weapon = { id: weapon };
  }
  //console.log('input', weapon);
  var w = $.extend(true, {}, getWeapon(weapon.id), weapon);
  //console.log('output', w);
  return w;
}

function getWeapon(id) {
  var w;
  $.each( $('body').data('armyDef').weapons, function(key, val) {
    if (val.id == id) {
      w = val;
      if (!w.number) {
        w.number = 1;
      }
      return;
    }
  });
  
  if (!w) {
    console.log("cannot find weapon "+id+" in "+$('body').data('armyDef').weapons.length+" weapons");
    return null;
  }

  if (w.parent) {
    var parent = getWeapon(w.parent);
    var merged = $.extend( {}, parent, w ); // New object overriding the parent
    $.extend( w, merged ); // Merge the properties into this object instance
  }

  return w;
}

function updateReferenceList() {
  var selectedVariants = {};

  for (var i=0;i<session['detachments'].length; i++) {
    if (session['detachments'][i] == null) {
      continue;
    }
    var unitList = session['detachments'][i]['units'];
    for (var j=0;j<unitList.length; j++) {
      var variant = unitList[j];

      console.log(variant);

      if (!selectedVariants[variant.unitId]) {
        selectedVariants[variant.unitId] = {};
      }

      if (!selectedVariants[variant.unitId][variant.id]) {
        selectedVariants[variant.unitId][variant.id] = variant.options;
      }
    }
  }

  var refList = $('div.entry-list');
  refList.hide();
  refList.find('.row').remove();

  var rowClass = "color1";
  var unitStruct = $('body').data('armyDef').units;
  $.each( unitStruct, function(faction, val) {

    $.each( val, function(type, unitArray) {
      // Every unit
      $.each( unitArray, function(i, unit) {
        if (selectedVariants[unit.id]) {

          $.each( selectedVariants[unit.id], function(variantId, optionIds) {
            var variant = getUnitVariant(unit.id, optionIds);
            var unitDiv = buildRefRow(type, variant);
            unitDiv.attr("class", "row "+rowClass);
            if (rowClass == "color1") {
              rowClass = "color2";
            } else {
              rowClass = "color1";
            }
            refList.append(unitDiv);
          } );
        }

      });
    });
  });
  
  refList.show();
}

function createReferenceList() {

  var refList = $('div.entry-list');
  refList.hide();
  refList.find('.row').remove();
  refList.find('.heading').remove();

  refList.append( buildUnitHeadingDiv() );
}

function buildUnitHeadingDiv() {
  
  var $unitDiv = $("<div>");
  $unitDiv.attr('class', 'heading');

  var $statsDiv = $("<div class='stats' />");
  $statsDiv.append($("<div class='cell stat type'>Type</div>"));
  $statsDiv.append($("<div class='cell stat'>Move</div>"));
  $statsDiv.append($("<div class='cell stat'>Save</div>"));
  $statsDiv.append($("<div class='cell stat'>CAF</div>"));
  $statsDiv.append($("<div class='cell stat'>Mor</div>"));
  $statsDiv.append($("<div class='cell stat'>Wnd</div>"));
  
  var $weaponsDiv = $("<div class='weapons'><div class='cell weapon-name'>Weapons</div><div class='cell range'>Rng</div><div class='cell dice'>D</div><div class='cell hit'>H</div><div class='cell ap'>AP</div><div class='cell weapon-notes'>Notes</div></div>");
//  var $weaponDiv = $("<div class='weapon'>");
//  $weaponsDiv.append($weaponDiv);
//  $weaponDiv.append($("<div class='cell weapon-name'>Weapons</div>"));
  
  $unitDiv.append($("<div class='cell unit-name'>Name</div>"));
  $unitDiv.append($statsDiv);
  $unitDiv.append($weaponsDiv);
  $unitDiv.append($("<div class='cell unit-notes'>Special Rules</div>"));
  
  return $unitDiv;
}

// Construct DOM entry for each unique unit in the reference sheet
function buildRefRow(type, variant) {
  
  var $unitDiv = $("<div>");
  $unitDiv.attr('class', 'row');
  $unitDiv.attr('id', "ref-"+variant.name);
  
  if (type == 'Infantry' || type == 'Aircraft') {
    type = type.substring(0, 3);
  } else if (type == 'Super-heavy Vehicle') {
    type = 'SHV';
  } else if (type == 'Titans') {
    type = 'Titan'
  } else if (type == 'Knights') {
    type = 'Knight'
  }

  var caf = variant.CAF ? variant.CAF : 0;
  var $nameDiv = $("<div>").attr('class', 'cell unit-name').append(variant.name);
  var $typeDiv = $("<div>").attr('class', 'cell stat type').append(type);
  var $spdDiv = $("<div>").attr('class', 'cell stat distance').append(variant.move ? variant.move : 0);
  var $armDiv = $("<div>").attr('class', 'cell stat roll').append(variant.save ? variant.save : '-');
  var $cafDiv = $("<div>").attr('class', 'cell stat').append(caf > 0 ? '+'+variant.CAF : caf);
  var $moraleDiv = $("<div>").attr('class', 'cell stat').append(variant.morale ? variant.morale+'+' : '-');
  var $woundDiv = $("<div>").attr('class', 'cell stat').append(variant.wounds ? variant.wounds : 1);
  
  $unitDiv.append($nameDiv);
  var $statsDiv = $("<div class='stats' />");
  $unitDiv.append($statsDiv);
  $statsDiv.append($typeDiv);
  $statsDiv.append($spdDiv);
  $statsDiv.append($armDiv);
  $statsDiv.append($cafDiv);
  $statsDiv.append($moraleDiv);
  $statsDiv.append($woundDiv);
  
  var $weaponsDiv = $("<div>").attr('class', 'weapons');
  $unitDiv.append($weaponsDiv);
  
  if (variant.weapons) {
    // Every weapon
    $.each ( variant.weapons, function(k, weaponMounting) {
      var weapon = getWeapon(weaponMounting.id);
      if (!weapon) {
        return;
      }
      var $weaponDiv = $("<div>").attr('class', 'weapon');
      
      var number = weaponMounting.number && weaponMounting.number > 1 ? (weaponMounting.number + 'x ') : '';
      $weaponDiv.append($("<div>").attr('class', 'cell weapon-name').append(number+weapon.name));
      var $weaponStats = $("<div>").attr('class', 'weapon-stats');
      $weaponDiv.append($weaponStats);

      if (weapon.profiles) { 
        $.each ( weapon.profiles, function(m, profile) {
          // Add a line for range/dice/to-hit/AP/notes for each attack of the weapon

          var $weaponLine = $("<div>").attr('class', 'weapon-line');

          var r = profile.range ? profile.range : '-';
          if ((/^\d[\d-]*$/).test(r)) {
            r = profile.range+'"' // inches
          }
          $weaponLine.append($("<div>").attr('class', 'cell range').append(r));
          var ap = profile.AP ? profile.AP : 0;
          if (profile.hit) {
            var d = profile.dice ? profile.dice : 1;
            var h = profile.hit;
            if ((/^\d+$/).test(h)) {
              h = h + '+';
            }
            //var stat = [d,h].join('x')+' AP '+ap;
            //$weaponLine.append($("<div>").attr('class', 'cell weapon-shots').append(stat));
            $weaponLine.append($("<div>").attr('class', 'cell dice').append(d));
            $weaponLine.append($("<div>").attr('class', 'cell hit').append(h));
            $weaponLine.append($("<div>").attr('class', 'cell AP').append(ap));
          }
          // Profiles without a to-hit are engagement-only
          else {
            //var stat = profile.AP ? 'AP '+profile.AP : 'N/A';
            //$weaponLine.append($("<div>").attr('class', 'cell weapon-shots').append(stat));
            $weaponLine.append($("<div>").attr('class', 'cell dice').append('-'));
            $weaponLine.append($("<div>").attr('class', 'cell hit').append('-'));
            $weaponLine.append($("<div>").attr('class', 'cell AP').append(ap));
          }

          var n = Array();
          if (profile.notes) {
            n = n.concat(profile.notes);
          }
          if (weaponMounting.arc) {
            n.push(weaponMounting.arc);
          }
          $weaponLine.append($("<div>").attr('class', 'cell weapon-notes').append(n.join(', ')));
          $weaponStats.append($weaponLine);
        });
      }
      
      $weaponsDiv.append($weaponDiv);
    });
  }
  
  var n = Array();
  if (variant.notes) {
    n = n.concat(variant.notes);
  }
  
  var $unitNotes = $("<div>").attr('class', 'cell unit-notes');
  $unitNotes.append(n.join(', '));
  $unitDiv.append($unitNotes);
  
  return $unitDiv;

}

function arrayEquals(array1, array2) {
  if (array1.length != array2.length) {
    return false;
  }

  for (var i=0; i<array1.length; i++) {
    if (array1[i] != array2[i]) {
      return false;
    }
  }
  return true;
}

function removeUnit() {
  var button = $(this);
  var unitItem = button.closest('li');
  var itemName = button.data("name");
  unitItem.remove();
}

function decreaseUnit() {
  var button = $(this);
  var unitItem = button.closest('li');

  // If this is the last one, remove the entry entirely
  if ( unitItem.data('count') < 2 ) {
    unitItem.children('button').last().trigger('click');
    return;
  }

  unitItem.data('count', unitItem.data('count') - 1 );
  unitItem.find('.count').text( unitItem.data('count') );
}

function addUnitVariant(itemId, itemName, options, itemCount) {
  if (!itemCount) {
    itemCount = 1;
  }
  var form = $('div#detachment-edit');
  var unitList = form.find('ul.selected-units');

  var variantId = unitVariantId(itemId, options); // my-unit|option1|option2
  var unitItem;
  unitList.children().each( function() {
                           if ($(this).data('id') == variantId) {
                            unitItem = $(this);
                            return;
                           }
                           });
  
  // If there isn't already one or more of the same unit variant, add it
  if (!unitItem) {
    // Render a new row for the unit
    unitItem = renderUnitSelection(itemName, options, itemCount);
    var buttons = $('<span class="unit-buttons" />');
    var increaseButton = $('<button>Increase</button>');
    increaseButton.button({ icons: { primary: "ui-icon-plus" }, text: false });
    increaseButton.click(function(){addUnitVariant(itemId, itemName, options, 1)});
    var decreaseButton = $('<button>Decrease</button>');
    decreaseButton.button({ icons: { primary: "ui-icon-minus" }, text: false });
    decreaseButton.click(decreaseUnit);
    var removeButton = $('<button>Remove</button>');
    removeButton.button({ icons: { primary: "ui-icon-trash" }, text: false });
    removeButton.click(removeUnit);
    buttons.append( increaseButton );
    buttons.append( decreaseButton );
    buttons.append( removeButton );
    unitItem.prepend( buttons );
    
    // Store details of the unit as data so we can easily find it later
    var unitData = {
      'id': variantId,
      'unitId': itemId,
      'count': itemCount,
      'name': itemName,
      'options': options.slice()
    };
    unitItem.data(unitData);

    unitItem.appendTo(unitList);
  }
  // Otherwise just increment the count
  else {
    unitItem.data('count', unitItem.data('count') + itemCount );
    unitItem.find('.count').text( unitItem.data('count') );
  }
}

function saveDetachment() {
  var form = $('div#detachment-edit');
  var name = form.find('input#detachment-name').val();

  // Prepare an array of units to store in the session
  var unitList = form.find('ul.selected-units');
  var unitData = [];
  unitList.children().each( function() {
    var tmp = $(this).data();
    unitData.push(tmp);
  });
  
  var detachmentDiv = form.data('detachmentDiv');
  var detachmentData;
  // If a div already exists (i.e. the user was editing an existing formation)
  if (detachmentDiv) {
    detachmentData = detachmentDiv.data('detachmentData');
    detachmentData['name'] = name;
    detachmentData['units'] = unitData;
  }
  // Otherwise we need to create a new one
  else {
    detachmentData = {'units':unitData, 'name':name};
    session['detachments'].push( detachmentData );
  }

  closeDetachmentEditForm();
  
  // Render the detachment in the detachment list part of the UI
  // If there is no div, this function will create one
  renderDetachment(detachmentData, detachmentDiv)
  
  updateReferenceList();
}

function closeFormationEditForm() {
  // Reset the editing form
  var form = $('div#formation-edit');
  var detachmentList = form.find('ul.selected-detachments');
  form.data('formationDiv', null);
  form.find('input').val('');
  detachmentList.empty();
  form.dialog('close');
  form.find('.tabs').tabs('option','active',0);
}

function closeDetachmentEditForm() {
  // Reset the editing form
  var form = $('div#detachment-edit');
  var unitList = form.find('ul.selected-units');
  form.data('detachmentDiv', null);
  form.find('input').val('');
  unitList.empty();
  form.dialog('close');
  form.find('.tabs').tabs('option','active',0);
}

function filterUnitsByFaction(selectedFaction) {
  if (selectedFaction == 'All') {
    $('div#detachment-edit .tabs').tabs('enable');
    $('div#detachment-edit .tabs .tab div').show();
  } else {
    $('div#detachment-edit .tabs').tabs('disable'); // disable all tabs to start with
    $('div#detachment-edit .tabs .tab div').hide(); // hide all the units to start with
    var enabledTabs = [];
    $('div#detachment-edit .tabs .tab').each(function(tabIndex) {
      var units = $(this).find('div[data-faction="'+selectedFaction+'"]');
      // Show the units of the selected faction
      units.show();
      // Enable the tab if there are any units visible
      if (units.length > 0) {
        $('div#detachment-edit .tabs').tabs('enable', tabIndex);
        enabledTabs.push(tabIndex);
      }
    });
    // If the currently active tab is no longer enabled, switch to the first enabled tab
    if (enabledTabs.length > 0 && $.inArray($('div#detachment-edit .tabs').tabs('option','active'), enabledTabs) === -1) {
      $('div#detachment-edit .tabs').tabs('option','active',enabledTabs[0]);
    }
  }
}

function renderFormation(formationData, formationDiv) {
  
  if (!formationData) {
    console.log('No formation data!');
    return null;
  }
  
  // If a div doesn't exist we need to create one
  if (!formationDiv) {
    // Create a div in the formation list part of the UI
    formationDiv = $('#formation-template .formation').clone(true);
    formationDiv.data('formationData', formationData);
    $('div#formations').append( formationDiv );
    formationDiv.show();
  }
  
  // Set the name
  var name = formationData['name'];
  if (name == "") {
    var formationNum = session['formations'].indexOf(formationData) + 1;
    name = "Formation " + formationNum;
  }
  formationDiv.find('.formation-heading').html(name);
  formationDiv.find('.selected-formation-type').html('Type: '+formationData['type']);

  // Render the detachments
  var detachmentList = formationDiv.find('ul.selected-detachments');
  detachmentList.empty();
  for (var i=0; i<formationData['detachments'].length; i++) {
    var unit = formationData['detachments'][i];
    var unitItem = $('<li><div class="detachment-label"><span class="count">'+unit['count']+'</span><span>x </span><span>'+unit['name']+'</span></div></li>');
    detachmentList.append(unitItem);
  }
  
  return formationDiv;
}

/**
function editFormation(formationDiv) {
  var form = $('div#formation-edit');
  
  // If editing an existing formation, populate the editing form
  if (formationDiv != null) {
    form.data('formationDiv', formationDiv);
  
    var formationData = formationDiv.data('formationData');
  
    // Populate the edit form with the details of the formation being edited
    form.find('input').val(formationData['name']);
    for (var i=0; i<formationData['units'].length; i++) {
      var unit = formationData['units'][i];
      addDetachment(unit['name'], unit['count']);
    }
  }
  
  form.dialog('open');
}
*/

function renderUnitSelection(itemName, options, itemCount) {
  var label = itemName;
  if (options) {
    options = options.filter((w) => w != '---');
    if (options.length > 0) {
      label += ' ('+options.map(function(w) {return getWeapon(w).name} ).join(', ')+')';
    }
  }
  return $('<li><div class="unit-label"><span class="count">'+itemCount+'</span><span>x </span><span>'+label+'</span></div></li>');
}

function renderDetachment(detachmentData, detachmentDiv) {
  
  if (!detachmentData) {
    console.log('No detachment data!');
    return null;
  }
  
  // If a div doesn't exist we need to create one
  if (!detachmentDiv) {
    // Create a div in the detachment list part of the UI
    detachmentDiv = $('#detachment-template .detachment').clone(true);
    detachmentDiv.data('detachmentData', detachmentData);
    $('div#detachments').append( detachmentDiv );
    detachmentDiv.show();
  }
  
  // Set the name
  var name = detachmentData['name'];
  if (name == "") {
    var detachmentNum = session['detachments'].indexOf(detachmentData) + 1;
    name = "Detachment " + detachmentNum;
  }
  detachmentDiv.find('.detachment-heading').html(name);

  // Render the units
  var unitList = detachmentDiv.find('ul.selected-units');
  unitList.empty();
  for (var i=0; i<detachmentData['units'].length; i++) {
    var unit = detachmentData['units'][i];
    var unitItem = renderUnitSelection(unit['name'], unit['options'], unit['count']);
    //$('<li><div class="unit-label"><span class="count">'+unit['count']+'</span><span>x </span><span>'+unit['name']+'</span></div></li>');
    unitList.append(unitItem);
  }
  
  return detachmentDiv;
}

function editDetachment(detachmentDiv) {
  var form = $('div#detachment-edit');
  
  // If editing an existing detachment, populate the editing form
  if (detachmentDiv != null) {
    form.data('detachmentDiv', detachmentDiv);
  
    var detachmentData = detachmentDiv.data('detachmentData');
  
    // Populate the edit form with the details of the detachment being edited
    form.find('input').val(detachmentData['name']);
    for (var i=0; i<detachmentData['units'].length; i++) {
      var unit = detachmentData['units'][i];
      console.log(unit);
      addUnitVariant(unit['unitId'], unit['name'], unit['options'], unit['count']);
    }
  }
  
  form.dialog('open');
}

function deleteDetachment(detachmentDiv) {
  var detachmentData = detachmentDiv.data('detachmentData');
  detachmentDiv.remove();
  var index = session['detachments'].indexOf(detachmentData);
  if (index > -1) {
    session['detachments'].splice(index, 1);
  }
  updateReferenceList();
}

function deleteAllDetachments() {
  $('div#detachments').empty();
  session['detachments'] = [];
  updateReferenceList();
}

function saveList() {
  $.jStorage.set("session-LI", session);
}

function importList() {
  var stored = $.jStorage.get("session-LI");
  if (stored) {
    session = stored;
    $('div#detachments').empty();
    var i = 0;
    for (i=0;i<session['detachments'].length;i++) {
      var detachmentData = session['detachments'][i];
      renderDetachment(detachmentData);
    }
    updateReferenceList();
    return i;
  } else {
    alert('No stored list to import - please make a new one');
    return 0;
  }
}

// END OF FUNCTIONS

$(document).ready(function(){

  $('select[name="army"]').change(function() {
    var listVersion = $('select[name="army"] option:selected').val();
    changeArmy(listVersion);
  });

  // Setup UI event handlers
  $('#add-detachment').button({ icons: { primary: "ui-icon-plusthick" }, label: "Add Detachment" });
  $('#add-detachment').click(function() {editDetachment(null)});
  $('#save-roster').button({ icons: { primary: "ui-icon-arrowthickstop-1-s" }, label: "Store Roster in Session" });
  $('#save-roster').click(saveList);
  $('#import-roster').button({ icons: { primary: "ui-icon-arrowthickstop-1-n" }, label: "Import Roster from Session" });
  $('#import-roster').click(importList);
  $('#clear-roster').button({ icons: { primary: "ui-icon-trash" }, label: "Clear Roster" });
  $('#clear-roster').click(deleteAllDetachments);

  $('div#detachment-edit').dialog({autoOpen: false, modal: true, width: '50%', close: closeDetachmentEditForm, closeOnEscape: true});
  $('div#detachment-edit #faction-filter').change(function() {
    var selectedFaction = $(this).val();
    filterUnitsByFaction(selectedFaction);
  });
  $('div#detachment-edit .save-button').button({ icons: { primary: "ui-icon-check" }, label: "Save" }).click(function() {
    saveDetachment();
  //  $('#sections').accordion('refresh');
  });

  $('#detachment-template .edit-button').button({ icons: { primary: "ui-icon-pencil" }, label: "Edit" }).click(function() {
    var detachmentDiv = $(this).closest('.detachment');
    editDetachment(detachmentDiv);
  //  $('#sections').accordion('refresh');
  });

  $('#detachment-template .delete-button').button({ icons: { primary: "ui-icon-trash" }, label: "Delete" }).click(function() {
    var detachmentDiv = $(this).closest('.detachment');
    deleteDetachment(detachmentDiv);
  });

  for (var i=0; i<lists.length; i++) {
    var list = lists[i];
    $('select[name="army"]').append('<option value="' + list.version + '">' + list.name + '</option>');
  }
  // Default to most recent
  changeArmy( lists[0].version );

});
