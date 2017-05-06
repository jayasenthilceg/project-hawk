
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
}

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

function prepareStats() {
  // cleanup siteurls
  for(siteUrl in sites) {
    var siteHost = new URL(siteUrl).hostname.replace('www.','');
    var timeSpent = sites[siteUrl];
    siteHostVsTimeSpent[siteHost] = (siteHostVsTimeSpent[siteHost]||0) + timeSpent;
  }
  // remove noise
  delete siteHostVsTimeSpent['extensions'];
  delete siteHostVsTimeSpent['newtab'];
  
  // categorize time spent
  for(siteHost in siteHostVsCategory) {
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
      percentage: (stat.time / totalTime * 100).toFixed(2),
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

document.addEventListener("DOMContentLoaded", function() {
  // document.getElementById("clear").addEventListener("click",
  //   function() { if (confirm("Are you sure?")) { clearStats(); }});
  // document.getElementById("options").addEventListener("click",
  //     function() { chrome.runtime.openOptionsPage(); });
  // var buttons = document.querySelectorAll("button");
  initialize();
  console.log(sortedSiteStats[0])
  for (i=0; i < 4; i++ ) {
    var dahsboardHtml = '<div class="col-md-3"><div class="dashboard-box"><a href="http://${sortedSiteStats[i].statName}"><h3>${sortedSiteStats[i].statName}</h3></a><h4>${sortedSiteStats[i].statValue}</h4><h6 class="percentage">${sortedSiteStats[i].percentage}</h6></div></div>';
    $.template( "dashboardTmpl", dahsboardHtml );
    $.tmpl( "dashboardTmpl", sortedSiteStats[i] ).appendTo( ".dahboard-container" );
  }
});
