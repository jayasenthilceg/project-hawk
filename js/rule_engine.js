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
//         'actionType': 'warningNotificationAction'
//       }]
//     },
//     'daily': {
//       'event': {
//         'metric': 'timeSpent',
//         'operator': 'greaterThan',
//         'compareAgainst': '200'
//       },
//       'actions': [{
//         'actionType': 'warningNotificationAction'
//       },{
//         'actionType': 'closeTabAction'
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
  'alertAction': function(msg) {
    alert('alert:' + msg);
  },
  'newTabAction': function(msg) {
    alert('newTabAction:' + msg);
  },
  'closeTabAction': function(msg) {
    alert('closeTabAction:' + msg);
  },
  'cheersNotificationAction': function(msg) {
    alert('Cheers!:' + msg);
  },
  'warningNotificationAction': function(msg) {
    alert('Warning!:' + msg);
  },
  'blockingNotificationAction': function(msg) {
    alert('Blocking!:' + msg);
  },
  'customNotificationAction': function(msg) {
    alert('customNotificationAction:' + msg);
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
  'twitter.com': {
    'hourly': {
      'event': {
        //'metric': 'timeSpent',
        'operator': 'greaterThan',
        'compareAgainst': '10'
      },
      'actions': [{
        'actionType': 'warningNotificationAction'
      }]
    }
  }
}

// TEST
// var counter = {
//   'facebook.com': 0
// };
// var observer = new ObjectObserver(counter);
var siteVsHourlyTimeSpent = {}
var siteVsHourlyTimeSpentObserver = new ObjectObserver(siteVsHourlyTimeSpent);
siteVsHourlyTimeSpentObserver.open(function(added, removed, changed, getOldValueFn) {
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
    actionVsFn[action.actionType]('test');
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

function updateAndObserve(counterObj, key, value) {
  counterObj[key] = (counterObj[key]||0) + value;
  Platform.performMicrotaskCheckpoint();
}

// Test
// updateAndObserve(counter, 'facebook.com', 1);
// updateAndObserve(counter, 'facebook.com', 10);
// updateAndObserve(counter, 'facebook.com', 30);
// updateAndObserve(counter, 'facebook.com', 40);

// TODO
// 3. persist counters
// 4. Time observer - to reset counters on time window expiry.
// 5. persist rules.
// 6. load rules from persistence