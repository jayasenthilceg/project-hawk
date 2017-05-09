
var config = new Config();
var gsites = new Sites(config);

function addIgnoredSite(new_site) {
  return function() {
    chrome.extension.sendRequest(
       {action: "addIgnoredSite", site: new_site},
       function(response) {
         initialize();
       });
  };
}

function humanizeTime(seconds) {
  if (config.timeDisplayFormat == Config.timeDisplayFormatEnum.MINUTES) {
    return (seconds/60).toFixed(2);
  }
  var years = Math.floor(seconds / 31536000);
  var days = Math.floor((seconds % 31536000) / 86400);
  var hours = Math.floor(((seconds % 31536000) % 86400) / 3600);
  var mins = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
  var secs = (((seconds % 31536000) % 86400) % 3600) % 60;
  var s = "";
  if (years) {
    s = s + " " + years + "y";
  }
  if (days) {
    s = s + " " + days + "d";
  }
  if (hours) {
    s = s + " " + hours + "h";
  }
  if (mins) {
    s = s + " " + mins + "m";
  }
  if (secs) {
    s = s + " " + secs.toFixed(0) + "s";
  }
  return s;
}

var sites = gsites.sites;
var siteHostVsCategory = {
  'facebook.com': 'social',
  'twitter.com': 'social',
  'whatsapp.com': 'communications',
  'mail.google.com': 'communications',
  'skype.com': 'communications',
  'inbox.google.com': 'communications',
  'youtube.com': 'entertainment',
  'github.com': 'productivity',
  'stackoverflow.com': 'productivity',
  'google.com': 'search',
  'calendar.google.com': 'communications',
};

var siteHostVsTimeSpent = {}
var categoryVsTimeSpent = {
  social: 0,
  communications: 0,
  entertainment: 0,
  productivity: 0,
  search: 0,
  others: 0
};
var totalTime = undefined;
var sortedSiteStats = {};
var sortedCategoryStats= {};
var ruleOptions = {};
var actionOptions = {};

function prepareStats() {
  // cleanup siteurls
  for(siteUrl in sites) {
    // dirty check
    if(siteUrl.indexOf('.') == -1) {
      continue;
    }
    var siteHost = siteUrl;
    var timeSpent = sites[siteUrl];
    siteHostVsTimeSpent[siteHost] = (siteHostVsTimeSpent[siteHost]||0) + timeSpent;
  }
  
  // categorize time spent
  for(siteHost in siteHostVsTimeSpent) {
    var timeSpent = siteHostVsTimeSpent[siteHost]||0;
    if(siteHost in siteHostVsCategory){
      categoryVsTimeSpent[siteHostVsCategory[siteHost]] += timeSpent;
    } else {
      categoryVsTimeSpent['others'] += timeSpent;
    }
  }
}

function transformStats(siteDict) {
  var sortedStats = new Array();
  for(site in siteDict) {
    sortedStats.push(
      {
        statName: site,
        time: siteDict[site]
      }
    );
  }
  sortedStats.sort(function(a, b) {
    return b.time - a.time;
  });
  var maxTime = sortedStats[0].time;
  return sortedStats.map(function(stat) {
    return {
      statName: stat.statName,
      statValue: humanizeTime(stat.time),
      percentage: ((stat.time / totalTime) * 100).toFixed(2),
      // relativePct: (stat.time / maxTime * 100).toFixed(2)
    }
  });
}

function sendStats() {
  chrome.extension.sendRequest({action: "sendStats"}, function(response) {
   /* Reload the iframe. */
   var iframe = document.getElementById("stats_frame");
   iframe.src = iframe.src;
  });
}

function clearStats() {
  chrome.extension.sendRequest({action: "clearStats"}, function(response) {
   initialize();
  });
}

function initialize() {
  prepareStats();
  totalTime = Object.values(categoryVsTimeSpent).reduce((a, b) => a + b).toFixed(2);
  sortedSiteStats = transformStats(siteHostVsTimeSpent);
  sortedCategoryStats = transformStats(categoryVsTimeSpent);
  // displayStats(siteHostVsTimeSpent, "category_stats_tbody");
  // displayStats(categoryVsTimeSpent, "sites_stats_tbody");

  if (config.lastClearTime) {
    var div = document.getElementById("lastClear");
    if (div.childNodes.length == 1) {
      div.removeChild(div.childNodes[0]);
    }
    div.appendChild(
      document.createTextNode("Last Reset: " + new Date(
        config.lastClearTime).toString()));
  }

  var nextClearStats = config.nextTimeToClear;
  if (nextClearStats) {
   nextClearStats = parseInt(nextClearStats, 10);
   nextClearStats = new Date(nextClearStats);
   var nextClearDiv = document.getElementById("nextClear");
   if (nextClearDiv.childNodes.length == 1) {
     nextClearDiv.removeChild(nextClearDiv.childNodes[0]);
   }
   nextClearDiv.appendChild(
     document.createTextNode("Next Reset: " + nextClearStats.toString()));
  }
}
$(function() {
  $("#rule_options_form").on('submit',function(e){
    var actionOptions = objectifyForm($(this).serializeArray());
    debugger;
    localStorage.rules = JSON.stringify(actionOptions);
      // var siteVsRules = {
//   'twitter.com': {
//     'hourly': {
//       'event': {
//         //'metric': 'timeSpent',
//         'operator': 'greaterThan',
//         'compareAgainst': '10'
//       },
//       'actions': [{
//         'actionType': 'warningNotificationAction'
//       }]
//     }
//   }
// }

    e.preventDefault();
  });
  function objectifyForm(formArray) {
    // debugger;
    returnArray = {};
    for (var i = 0; i < formArray.length; i++) {
        returnArray[formArray[i]['name']] = formArray[i]['value'];
    }
    var newRuleObject = {
      'hourly': {
        'event': {
          'operator': returnArray['operator'],
          'compareAgainst': returnArray['value']
        },
        'actions': [{
          'actionType': returnArray['action_type']
        }]
      }
    };
    // debugger;
    var returnObject = {},
        url = '';
    try {
        url = new URL(returnArray['site']).hostname.replace('www.', '');
    }catch(e) {
        url = returnArray['site'];
    }
      returnObject[url] = newRuleObject;
    return returnObject;
  }

  $('#action_type_values').change(function(){
    if (this.value==='customNotificationAction')
    {
      $('.custom-msg-value').fadeIn("slow").removeClass('hide');
      $('.open-tab-value').fadeOut("slow").addClass('hide');
    }
    else if(this.value ==='newTabAction') {
      $('.open-tab-value').fadeIn("slow").removeClass('hide');
      $('.custom-msg-value').fadeOut("slow").addClass('hide');
    } else {
      $('.custom-msg-value, .open-tab-value').fadeOut("slow").addClass('hide');
    }
  });
});
document.addEventListener("DOMContentLoaded", function() {
  // document.getElementById("clear").addEventListener("click",
  //   function() { if (confirm("Are you sure?")) { clearStats(); }});
  // document.getElementById("options").addEventListener("click",
  //     function() { chrome.runtime.openOptionsPage(); });
  // var buttons = document.querySelectorAll("button");
  initialize();
  for (i=0; i < 4; i++ ) {
    // top visited websites
    var dashboardHtml = '<div class="col-md-3"><div class="dashboard-box"><a href="http://${sortedSiteStats[i].statName}"><h3>${sortedSiteStats[i].statName}</h3></a><h4>${sortedSiteStats[i].statValue}</h4><h6 class="percentage">${sortedSiteStats[i].percentage} %</h6></div></div>';
    $.template( "dashboardTmpl", dashboardHtml );
    $.tmpl( "dashboardTmpl", sortedSiteStats[i] ).appendTo( ".dahboard-container" );

    // category based websites
    var dashboardHtmlCategory = '<div class="col-md-3"><div class="dashboard-box"><h3>${sortedCategoryStats[i].statName}</h3><h4>${sortedCategoryStats[i].statValue}</h4><h6 class="percentage">${sortedCategoryStats[i].percentage} %</h6></div></div>';
    $.template( "dashboardTmplCategoryTmpl", dashboardHtmlCategory );
    $.tmpl( "dashboardTmplCategoryTmpl", sortedCategoryStats[i] ).appendTo( ".dahboard-container-category" );
  }
  //all sites list
  for (i = 0 ; i < sortedSiteStats.length; i++) {
    var tableAllSitesList = '<tr> <th scope="row">${i+1}</th> <td>${sortedSiteStats[i].statName}</td> <td>${sortedSiteStats[i].statValue}</td> <td>${sortedSiteStats[i].percentage}</td> </tr>';
    var selectOptionList = '<option name="${sortedSiteStats[i].statName}">${sortedSiteStats[i].statName}</option>'
    $.template( "tableAllSitesListTmpl", tableAllSitesList );
    $.template( "selectOptionListTmpl", selectOptionList );
    $.tmpl( "tableAllSitesListTmpl", sortedSiteStats[i] ).appendTo( ".all-sites-list-tabl" );
    $.tmpl( "selectOptionListTmpl", sortedSiteStats[i] ).appendTo( ".site-name-list" );
  }

});
