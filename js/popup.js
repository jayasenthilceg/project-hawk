
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

function secondsToString(seconds) {
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

function displayStats(siteDict, htmlElementId) {
  var sortedStats = new Array();
  var totalTime = 0;
  for (site in siteDict) {
   sortedStats.push([site, siteDict[site]]);
   totalTime += siteDict[site];
  }
  sortedStats.sort(function(a, b) {
   return b[1] - a[1];
  });

  /* Show only the top 15 sites by default */
  var max = 15;
  if (document.location.href.indexOf("show=all") != -1) {
   max = sortedStats.length;
  }

  var old_tbody = document.getElementById(htmlElementId);
  var tbody = document.createElement("tbody");
  tbody.setAttribute("id", htmlElementId);
  old_tbody.parentNode.replaceChild(tbody, old_tbody);

  /* Add total row. */
  var row = document.createElement("tr");
  var cell = document.createElement("td");
  cell.innerHTML = "<b>Total</b>";
  row.appendChild(cell);
  cell = document.createElement("td");
  cell.appendChild(document.createTextNode(secondsToString(totalTime)));
  row.appendChild(cell);
  cell = document.createElement("td");
  cell.appendChild(document.createTextNode(("100")));
  row.appendChild(cell);
  row = setPercentageBG(row,0);
  tbody.appendChild(row);

  var maxTime = 0;
  if (sortedStats.length) {
    maxTime = siteDict[sortedStats[0][0]];
  }
  var relativePct = 0;
  for (var index = 0; ((index < sortedStats.length) && (index < max));
      index++ ){
   var site = sortedStats[index][0];
   row = document.createElement("tr");
   cell = document.createElement("td");
   var removeImage = document.createElement("img");
   removeImage.src = chrome.extension.getURL("/images/remove.png");
   removeImage.title = "Remove and stop tracking.";
   removeImage.width = 15;
   removeImage.height = 10;
   removeImage.onclick = addIgnoredSite(site);
   cell.appendChild(removeImage);
   var a = document.createElement('a');
   var linkText = document.createTextNode(site);
   a.appendChild(linkText);
   a.title = "Open link in new tab";
   a.href = site;
   a.target = "_blank";
   cell.appendChild(a);
   row.appendChild(cell);
   cell = document.createElement("td");
   cell.appendChild(document.createTextNode(secondsToString(siteDict[site])));
   row.appendChild(cell);
   cell = document.createElement("td");
   cell.appendChild(document.createTextNode(
     (siteDict[site] / totalTime * 100).toFixed(2)));
   relativePct = (siteDict[site]/maxTime*100).toFixed(2);
   row = setPercentageBG(row,relativePct);
   row.appendChild(cell);
   tbody.appendChild(row);
  }

  /* Show the "Show All" link if there are some sites we didn't show. */
  if (max < sortedStats.length && document.getElementById("show") == null) {
    /* Add an option to show all sites */
    var showAllLink = document.createElement("a");
    showAllLink.onclick = function() {
     chrome.tabs.create({url: "popup.html?show=all"});
    }
    showAllLink.setAttribute("id", "show");
    showAllLink.setAttribute("href", "javascript:void(0)");
    showAllLink.setAttribute("class", "pure-button");
    showAllLink.appendChild(document.createTextNode("Show All"));
    document.getElementById("button_row").appendChild(showAllLink);
  } else if (document.getElementById("show") != null) {
    var showLink = document.getElementById("show");
    showLink.parentNode.removeChild(showLink);
  }
}

function setPercentageBG(row,pct) {
  var color = "#e8edff";
  row.style.backgroundImage = "-webkit-linear-gradient(left, "+color+" "+pct+"%,#ffffff "+pct+"%)";
  row.style.backgroundImage = "    -moz-linear-gradient(left, "+color+" "+pct+"%, #ffffff "+pct+"%)";
  row.style.backgroundImage = "     -ms-linear-gradient(left, "+color+" "+pct+"%,#ffffff "+pct+"%)";
  row.style.backgroundImage = "      -o-linear-gradient(left, "+color+" "+pct+"%,#ffffff "+pct+"%)";
  row.style.backgroundImage = "         linear-gradient(to right, "+color+" "+pct+"%,#ffffff "+pct+"%)";
  return row;
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
  displayStats(siteHostVsTimeSpent, "category_stats_tbody");
  displayStats(categoryVsTimeSpent, "sites_stats_tbody");

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
});
