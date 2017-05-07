// Rule Engine:
// 
// Event-Condition-Action pattern
// 
// 3 buckets to collect timeSpent - hourly, daily, weekly
// Buckets eg.
//   key is domain, value is seconds
//   siteVsHourlyTimeSpent = {
//     'google.com': '10'
//   }
//   siteVsDailyTimeSpent = {
//     'google.com': '100'
//   }
//   siteVsWeeklyTimeSpent = {
//     'google.com': '1000'
//   }
// 
// On tab switch, we update the bucket & evaluate rules w.r.t to the site that got updated
// Rule eg.:
// rules = {
//   'facebook.com': {
//     'hourly': {
//       'event': {
//         'metric': 'timeSpent',
//         'operator': 'greaterThan',
//         'compareAgainst': '30'
//       },
//       'actions': [{
//         'actionKey': 'warningNotification'
//       }]
//     },
//     'daily': {
//       'event': {
//         'metric': 'timeSpent',
//         'operator': 'greaterThan',
//         'compareAgainst': '200'
//       },
//       'actions': [{
//         'actionKey': 'warningNotification'
//       },{
//         'actionKey': 'closeTab'
//       }
//       ]
//     }
//   }
// }
// Rule evaluation simply checks for the rule event & executes action.
// 


var operators = {
  'lesserThan': function(val1, val2) {
    return val1 < val2;
  },
  'greaterThan': function(val1, val2) {
    return val1 > val2;
  },
  'equals': function(val1, val2) {
    return val1 == val2;
  }
}

var actionVsFn = {
  'alert': function(msg) {
    alert('alert:' + msg);
  },
  'newTab': function(msg) {
    alert('newTab:' + msg);
  },
  'closeTab': function(msg) {
    alert('closeTab:' + msg);
  },
  'cheersNotification': function(msg) {
    alert('Cheers!:' + msg);
  },
  'warningNotification': function(msg) {
    alert('Warning!:' + msg);
  },
  'blockingNotification': function(msg) {
    alert('Blocking!:' + msg);
  },
  'customNotification': function(msg) {
    alert('customNotification:' + msg);
  }
}

var metrics = {
  'timeSpent': function(stat) {
    return stat.timeSpent;
  },
  'visitCount': function(stat) {
    return stat.visitCount;
  }
}


var siteVsRules = {
  'facebook.com': {
    'hourly': {
      'event': {
        //'metric': 'timeSpent',
        'operator': 'greaterThan',
        'compareAgainst': '30'
      },
      'actions': [{
        'actionKey': 'warningNotification'
      }]
    }
  }
}


var counter = {
  'facebook.com': 0
};
var observer = new ObjectObserver(counter);
observer.open(function(added, removed, changed, getOldValueFn) {
  Object.keys(added).forEach(function(site) {
    console.log('site-added:' + site);
    var oldVal = getOldValueFn(site);
    var newVal = added[site];
  });
  Object.keys(changed).forEach(function(site) {
    console.log('site-changed:' + site);
    var oldVal = getOldValueFn(site);
    var newVal = changed[site];
    evaluateRulesFor(site, newVal);

  });
});

function isEvent(operator, actualValue, compareAgainst) {
  return operators[operator](parseInt(actualValue), parseInt(compareAgainst));
}

function executeActions(actions) {
  actions.forEach(function(action) {
    actionVsFn[action.actionKey]('test');
  });
}

function evaluateRulesFor(site, value, metric) {
  metric = 'timeSpent';
  if (!(site in siteVsRules)) {
   return;
  }
  for (ruleWindow in siteVsRules[site]) {
  	var rule = siteVsRules[site][ruleWindow]
    var operator = rule.event.operator;
    var compareAgainst = rule.event.compareAgainst;
    var eventOccured = false;
    if (isEvent(operator, value, compareAgainst)) {
      executeActions(rule.actions);
      eventOccured = true;
    }
    console.log('isEvent:'+eventOccured+' site: '+site+' rule - operator:'+operator+' value:'+value+' compareAgainst:'+compareAgainst);
  }
}

function updateCounter(counterObj, key, value) {
  counterObj[key] = (counterObj[key]||0) + value;
  Platform.performMicrotaskCheckpoint();
}

// Test
updateCounter(counter, 'facebook.com', 1);
updateCounter(counter, 'facebook.com', 10);
updateCounter(counter, 'facebook.com', 30);
updateCounter(counter, 'facebook.com', 40);

// TODO
// 1. create 3 counters for 3 time windows
// 2. update counters on tab switch events.
// 3. persist counters
// 4. Time observer - to reset counters on time window expiry.