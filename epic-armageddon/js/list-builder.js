/**
 * Copyright 2013-2024 Andrew Jenkinson
 **/

var lists = {
  'Epic UK': [
    { name: "Steel Legion", filename: "euk-steel-legion-1.0.json" },
    { name: "Tau 6.8", filename: "netea-tau-6.8.json" },
//    { name: "Ulani", filename:  "euk-ulani-1.0.json" }
  ],
  'NetEA': [
    { name: "Tau 6.6", filename: "netea-tau-6.6.json" },
    { name: "Tau 6.8", filename: "netea-tau-6.8.json" },
//    { name: "Steel Legion", filename: "netea-steel-legion-1.0.json" },
//    { name: "Ulani", filename:  "netea-ulani-1.0.json" }
  ]
};

var session = {
  'formations': [],
};

function changeSource(sourceName) {
  $('select[name="army"]').empty();
  $('select[name="army"]').append("<option>-- Select --</option>");
  var sourceLists = lists[sourceName];
  for (var i=0; i<sourceLists.length; i++) {
    var list = sourceLists[i];
    $('select[name="army"]').append("<option>" + list.name + '</option>');
  }
}

function changeArmy(sourceName, listName) {
  var sourceLists = lists[sourceName];

  // Not a valid source
  if (!sourceLists) {
    return;
  }

  var list;
  for (var i=0; i<sourceLists.length; i++) {
    var tmp = sourceLists[i];
    if (tmp.name == listName) {
      list = tmp;
      break;
    }
  }

  // Not a valid list for that source
  if (!list) {
    return;
  }
  
  console.log('Fetching '+list.filename);

  // Fetch the army list JSON file
  $.getJSON('lists/'+list.filename, function(data) {
    // save the data
    data.units.sort(function(a, b) {
      var c = compareUnitType(a, b);
      if (c != 0) {
        return c;
      }
      return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
    });

    $.each(data.weapons, function(key, val) {
      compatibilityWeaponFixes(val);
    });

    $("body").data("armyDef", data);

    deleteAllFormations();
    createReferenceList();
    $('#buttons-block').show();

//        $( "#sections" ).accordion( "refresh" );
//        $( "#sections" ).accordion( "option", "active", 1 );

  
    // Update the editing form with the units in the army
                  
    var form = $('div#formation-edit');
    var tabs = form.find('.tabs');
    tabs.find('.tab').empty(); // remove all the existing unit buttons
    var tabLinks = tabs.find('li');
    tabLinks.hide();

    // Set up formation editor
    // A button for each unit is added within a tab based on that init's type
    $.each($('body').data('armyDef').units, function(key, val) {
      var tab;
      switch (val.type) {
        case 'Infantry':
          tab = tabs.find('#infantry');
          tabLinks.slice(0,1).show();
          break;
        case 'AV':
        case 'LV':
          tab = tabs.find('#vehicles');
          tabLinks.slice(1,2).show();
          break;
        case 'WE':
          tab = tabs.find('#engines');
          tabLinks.slice(2,3).show();
          break;
        case 'Character':
          tab = tabs.find('#characters');
          tabLinks.slice(3,4).show();
          break;
        case 'Aircraft':
          tab = tabs.find('#aircraft');
          tabLinks.slice(4,5).show();
          break;
        default:
          console.log("Unrecognised type: "+val.type);
      }
      var button = $('<button>'+val.name+'</button>');
      button.button();
      button.click(function() {addUnit(val.name)});
      tab.append( button );
    });
    
    tabs.tabs(); // Render as tabs
    //importList();
                
  });
  
}

function compatibilityWeaponFixes(w) {

  var label = w.id ? w.id : w.name
  
  if (!w.attacks) {
    console.log("COMPAT: Missing attacks object for weapon "+label);
    w.attacks = []
  }
  // Allow JSON structure to be a single-object instead of array
  else if (!Array.isArray(w.attacks)) {
    console.log("COMPAT: Coverting attacks object to array for weapon "+label);
    w.attacks = [ w.attacks ]
  }
  // CC/FF as a true/false on the weapon object, no attacks array
  if (w.CC) {
    console.log("COMPAT: Adding attack object for CC of weapon "+label);
    w.attacks.push( { "CC": true, "notes": w.notes } )
  }
  if (w.FF) {
    console.log("COMPAT: Adding attack object for FF of weapon "+label);
    w.attacks.push( { "FF": true, "notes": w.notes } )
  }

  return w
}

function getWeapon(id, name) {
  var w;
  $.each( $('body').data('armyDef').weapons, function(key, val) {
         if (id) {
//         console.log("\""+val.id+"\" vs \""+id+"\"");
         }
    if (id) {
      if (val.id == id) {
        w = val;
        return;
      }
    }
    else if (name) {
      if (val.name == name) {
        w = val;
        return;
      }
    }
  });
  if (!w) {
    console.log("cannot find weapon "+id+" / "+name+" in "+$('body').data('armyDef').weapons.length+" weapons");
  }
  return w;
}

function updateReferenceList() {
  var selectedUnits = {};
  var selectedCount = 0;

  for (var i=0;i<session['formations'].length; i++) {
    if (session['formations'][i] == null) {
      continue;
    }
    var unitList = session['formations'][i]['units'];
    for (var j=0;j<unitList.length; j++) {
      var refId = "ref-"+unitList[j]['name'];
      if (selectedUnits[refId] != 1) {
        selectedUnits[refId] = 1;
        selectedCount++;
      }
    }
  }

  var rowClass = "color1";
  
  $('.entry-list').hide();
  if (selectedCount > 0) {
    var refs = $('.row');
    refs.each( function() {
              var id = $(this).attr("id");
              if (selectedUnits[id] == 1) {
                $(this).attr("class", "row "+rowClass);
                $(this).show();
                if (rowClass == "color1") {
                  rowClass = "color2";
                } else {
                  rowClass = "color1";
                }
              } else {
                $(this).hide();
              }
//            var refItem = $("[id='ref-"+itemName+"']");
//            refItem.show();
            });
    $('.entry-list').show();
  }
}

function createReferenceList() {
  var unitArray = $('body').data('armyDef').units;

  var $unitList = $('div.entry-list');
  $unitList.hide();
  $unitList.find('.row').remove();
  $unitList.find('.heading').remove();

  $unitList.append( buildUnitHeadingDiv() );
  
  // Every unit
  $.each( unitArray, function(i, unit) {
         
         var $unitDiv = buildUnitDiv(unit);

    $unitList.append($unitDiv);
  });
}

function buildUnitHeadingDiv() {
  
  var $unitDiv = $("<div>");
  $unitDiv.attr('class', 'heading');

  var $statsDiv = $("<div class='stats' />");
  $statsDiv.append($("<div class='cell stat'>Type</div>"));
  $statsDiv.append($("<div class='cell stat'>Speed</div>"));
  $statsDiv.append($("<div class='cell stat roll'>Arm</div>"));
  $statsDiv.append($("<div class='cell stat roll'>CC</div>"));
  $statsDiv.append($("<div class='cell stat roll'>FF</div>"));
  
  var $weaponsDiv = $("<div class='weapons'><div class='cell weapons-heading'>Weapons</div></div>");
//  var $weaponDiv = $("<div class='weapon'>");
//  $weaponsDiv.append($weaponDiv);
//  $weaponDiv.append($("<div class='cell weapon-name'>Weapons</div>"));
  
  $unitDiv.append($("<div class='cell unit-name'>Name</div>"));
  $unitDiv.append($statsDiv);
  $unitDiv.append($weaponsDiv);
  $unitDiv.append($("<div class='cell unit-notes'>Notes</div>"));
  
  return $unitDiv;
}

function buildUnitDiv(unit) {
  
  var $unitDiv = $("<div>");
  $unitDiv.attr('class', 'row');
  $unitDiv.attr('id', "ref-"+unit.name);
  
  var type = unit.type;
  if (type == 'Infantry' || type == 'Aircraft') {
    type = type.substring(0, 3);
  } else if (type == 'Character') {
    type = 'Ch';
  }

  var $nameDiv = $("<div>").attr('class', 'cell unit-name').append(unit.name);
  var $typeDiv = $("<div>").attr('class', 'cell stat').append(type);
  var $spdDiv = $("<div>").attr('class', 'cell stat').append(unit.speed ? unit.speed : '-');
  var $armDiv = $("<div>").attr('class', 'cell stat roll').append(unit.armour ? unit.armour : '-');
  var $ccDiv = $("<div>").attr('class', 'cell stat roll').append(unit.CC ? unit.CC : '-');
  var $ffDiv = $("<div>").attr('class', 'cell stat roll').append(unit.FF ? unit.FF : '-');
  
  $unitDiv.append($nameDiv);
  var $statsDiv = $("<div class='stats' />");
  $unitDiv.append($statsDiv);
  $statsDiv.append($typeDiv);
  $statsDiv.append($spdDiv);
  $statsDiv.append($armDiv);
  $statsDiv.append($ccDiv);
  $statsDiv.append($ffDiv);
  
  var $weaponsDiv = $("<div>").attr('class', 'weapons');
  $unitDiv.append($weaponsDiv);
  
  if (unit.weapons) {
    // Every weapon
    $.each ( unit.weapons, function(k, weaponMounting) {
      var weapon = getWeapon(weaponMounting.id, weaponMounting.name);
      if (!weapon) {
        return;
      }
      var $weaponDiv = $("<div>").attr('class', 'weapon');
      
      var number = weaponMounting.number && weaponMounting.number > 1 ? (weaponMounting.number + 'x ') : '';
      $weaponDiv.append($("<div>").attr('class', 'cell weapon-name').append(number+weapon.name));
      var $weaponStats = $("<div>").attr('class', 'weapon-stats');
      $weaponDiv.append($weaponStats);

      if (weapon.attacks) { 
        $.each ( weapon.attacks, function(m, attack) {
          // Add a line for range/firepower/notes for each attack of the weapon
          var $weaponLine = $("<div>").attr('class', 'weapon-line');
          if (attack.CC) {
            $weaponLine.append($("<div>").attr('class', 'cell stat range').append('(BtB)'));
            $weaponLine.append($("<div>").attr('class', 'cell stat firepower').append('(assault weapons)'));
            
          }
          else if (attack.FF) {
            $weaponLine.append($("<div>").attr('class', 'cell stat range').append('(15cm)'));
            $weaponLine.append($("<div>").attr('class', 'cell stat firepower').append('(small arms)'));
          }
          else {
            $weaponLine.append($("<div>").attr('class', 'cell stat range').append(attack.range));
            $weaponLine.append($("<div>").attr('class', 'cell stat firepower').append(hitValuesAsString(attack)));
          }
          var n = Array();
          if (attack.notes) {
            n = n.concat(attack.notes);
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
  if (unit.notes) {
    n = n.concat(unit.notes);
  }
  if (unit.DC) {
    n.push('DC '+unit.DC);
  }
  
  var $unitNotes = $("<div>").attr('class', 'cell unit-notes');
  $unitNotes.append(n.join(', '));
  $unitDiv.append($unitNotes);
  
  return $unitDiv;

}

function compareUnitType(a, b) {
  var scores = {
    'Character': 1,
    'Infantry': 2,
    'LV': 3,
    'AV': 4,
    'WE': 5,
    'Aircraft': 6
  };
  return scores[a.type] - scores[b.type];
}

function hitValuesAsString(attack) {
  var hits = Array();
  if (attack.MW) {
    hits.push('MW' + attack.MW);
  } else {
    if (attack.AP) {
      hits.push('AP' + attack.AP);
    }
    if (attack.AT) {
      hits.push('AT' + attack.AT);
    }
  }
  if (attack.AA) {
    hits.push('AA' + attack.AA);
  }

  var all = Array();
  if (hits.length > 0) {
    all.push( hits.join('/') );
  }
  if (attack.BP) {
    all.push(attack.BP+'BP');
  }
  if (all.length == 0) {
    all.push('-');
  }
  return all.join('<br/>OR ');
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

function addUnit(itemName, itemCount) {
  if (!itemCount) {
    itemCount = 1;
  }
  var form = $('div#formation-edit');
  var unitList = form.find('ul.selected-units');

  var unitItem;
  unitList.children().each( function() {
                           if ($(this).data('name') == itemName) {
                           unitItem = $(this);
                           }
                           });
  
  // If there isn't already one or more of the same unit, add it
  if (!unitItem) {
    // Render a new row for the unit
    var unitItem = $('<li><div class="unit-label"><span class="count">'+itemCount+'</span><span>x </span><span>'+itemName+'</span></div></li>');
    var buttons = $('<span class="unit-buttons" />');
    var increaseButton = $('<button>Increase</button>');
    increaseButton.button({ icons: { primary: "ui-icon-plus" }, text: false });
    increaseButton.click(function(){addUnit(itemName, 1)});
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
    unitItem.appendTo(unitList);
    
    // Store details of the unit as data so we can easily find it later
    unitItem.data('count', itemCount);
    unitItem.data('name', itemName);
  }
  // Otherwise just increment the count
  else {
    unitItem.data('count', unitItem.data('count') + itemCount );
    unitItem.find('.count').text( unitItem.data('count') );
  }
}

function saveFormation() {
  var form = $('div#formation-edit');
  var name = form.find('input').val();

  // Prepare an array of units to store in the session
  var unitList = form.find('ul.selected-units');
  var unitData = [];
  unitList.children().each( function() {
                           var tmp = {
                            'name': $(this).data('name'),
                            'count': $(this).data('count')
                           }
                           unitData.push(tmp);
                           });
  
  var formationDiv = form.data('formationDiv');
  var formationData;
  // If a div already exists (i.e. the user was editing an existing formation)
  if (formationDiv) {
    formationData = formationDiv.data('formationData');
    formationData['name'] = name;
    formationData['units'] = unitData;
  }
  // Otherwise we need to create a new one
  else {
    formationData = {'units':unitData, 'name':name};
    session['formations'].push( formationData );
  }

  closeEditForm();
  
  // Render the formation in the formation list part of the UI
  // If there is no div, this function will create one
  renderFormation(formationData, formationDiv)
  
  updateReferenceList();
}

function closeEditForm() {
  // Reset the editing form
  var form = $('div#formation-edit');
  var unitList = form.find('ul.selected-units');
  form.data('formationDiv', null);
  form.find('input').val('');
  unitList.empty();
  form.dialog('close');
  form.find('.tabs').tabs('option','active',0);
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

  // Render the units
  var unitList = formationDiv.find('ul.selected-units');
  unitList.empty();
  for (var i=0; i<formationData['units'].length; i++) {
    var unit = formationData['units'][i];
    var unitItem = $('<li><div class="unit-label"><span class="count">'+unit['count']+'</span><span>x </span><span>'+unit['name']+'</span></div></li>');
    unitList.append(unitItem);
  }
  
  return formationDiv;
}

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
      addUnit(unit['name'], unit['count']);
    }
  }
  
  form.dialog('open');
}

function deleteFormation(formationDiv) {
  var formationData = formationDiv.data('formationData');
  formationDiv.remove();
  var index = session['formations'].indexOf(formationData);
  if (index > -1) {
    session['formations'].splice(index, 1);
  }
  updateReferenceList();
}

function deleteAllFormations() {
  $('div#formations').empty();
  session['formations'] = [];
  updateReferenceList();
}

function saveList() {
  $.jStorage.set("session", session);
}

function importList() {
  var stored = $.jStorage.get("session");
  if (stored) {
    session = stored;
    $('div#formations').empty();
    var i = 0;
    for (i=0;i<session['formations'].length;i++) {
      var formationData = session['formations'][i];
      renderFormation(formationData);
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

$('select[name="source"]').change(function() {
  var sourceName = $('select[name="source"] option:selected').val();
  changeSource(sourceName);
});
$('select[name="army"]').change(function() {
  var sourceName = $('select[name="source"] option:selected').val();
  var listName = $('select[name="army"] option:selected').val();
  changeArmy(sourceName, listName);
});

// Setup UI event handlers
$('#add-formation').button({ icons: { primary: "ui-icon-plusthick" }, label: "Add Formation" });
$('#add-formation').click(function() {editFormation(null)});
$('#save-formations').button({ icons: { primary: "ui-icon-arrowthickstop-1-s" }, label: "Store Formations in Session" });
$('#save-formations').click(saveList);
$('#import-formations').button({ icons: { primary: "ui-icon-arrowthickstop-1-n" }, label: "Import Formations from Session" });
$('#import-formations').click(importList);
$('#clear-formations').button({ icons: { primary: "ui-icon-trash" }, label: "Delete All Formations" });
$('#clear-formations').click(deleteAllFormations);

$('div#formation-edit').dialog({autoOpen: false, modal: true, width: '50%', close: closeEditForm, closeOnEscape: true});
$('div#formation-edit .save-button').button({ icons: { primary: "ui-icon-check" }, label: "Save" }).click(function() {
  saveFormation();
//  $('#sections').accordion('refresh');
});

$('#formation-template .edit-button').button({ icons: { primary: "ui-icon-pencil" }, label: "Edit" }).click(function() {
  var formationDiv = $(this).closest('.formation');
  editFormation(formationDiv);
//  $('#sections').accordion('refresh');
});

$('#formation-template .delete-button').button({ icons: { primary: "ui-icon-trash" }, label: "Delete" }).click(function() {
  var formationDiv = $(this).closest('.formation');
  deleteFormation(formationDiv);
});

// changeSource("NetEA");
// changeArmy("NetEA", "Tau 6.8");

});
