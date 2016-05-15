

  	var browserTest = navigator.sayswho= (function(){
  var N= navigator.appName, ua= navigator.userAgent, tem;
  var M= ua.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i);
  if(M && (tem= ua.match(/version\/([\.\d]+)/i))!= null) M[2]= tem[1];
  M= M? [M[1], M[2]]: [N, navigator.appVersion,'-?'];
  return M;
 })();

	if (browserTest[0] == "MSIE" || browserTest[0] == "Firefox") {
		document.getElementById("badBrowser").style.display = "block";
		_gaq.push(['_trackEvent', 'errorEvent', "browser_unsupported, T: " + browserTest[0]]);
	}
	else {
	  startUp();
	}

function startUp() {
  firstRun = true;
  d3.select("#badBrowser").remove();
  cartogramRunning = false;
  voronoiRunning = false;
  routeSegments = [];
  excludedSites = [99999];
  //This is an array to hold the carto settings for reference by the clustering function
  cartogramsRun = [];
  flowsRun = [];
  routesRun = {};
  refreshSet = 0;
  currentRoute = 0;
  lastCartoRan = 0;
  priorityName = ["Days", "Denarii", "KM"];
  priorityType = ["Fastest", "Cheapest", "Shortest"];
  priorityColor = ["#FF680A", "#64FF0A", "#FFCE0A"];
  monthNames = [ "Zeroary", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December" ];
  frontierSetting = .8;
  directionHash = {0: "from", 1: "to"};
  sankeyHash = {};
  routeOpacity = false;
  orbisColorScale = colorbrewer.YlOrRd[5];
  psEffects = false;
  displaySites = true;
  sankeyRunning = false;
  networkOn = true;
  timelineOpen = true;
  dotStyle = false;
  clusterRunning = false;
  tempLabels = false;
  activeBGTypes = ["road", "coastal", "upstream", "downstream", "overseas", "ferry"];

  
  zoomDisplayRange = d3.scale.linear().domain([500,30000]).range([99,59]).clamp(true);
  siteSize = d3.scale.linear().domain([100,90,60]).range([36,26,20]).clamp(true);
  
  betweennessScale = d3.scale.linear().domain([0,0,0]).range([0,0,0])
  
  cheapestScale = colorbrewer.Greens[5];
  fastestScale = colorbrewer.Reds[5];
  shortestScale = colorbrewer.Purples[5];
  priorityColor = [fastestScale[4], cheapestScale[4], shortestScale[4]];

//var typeHash = {road: "brown", overseas: "green", dayfast: "#5CE68A", dayslow: "#5CE68A", slowcoast: "#5CE68A", coastal: "#5CE68A", upstream: "blue", downstream: "blue", fastup: "blue", fastdown: "blue", ferry: "#5CE68A"}
  typeHash = {hires: "#992e00 ", road: "#997A00", overseas: "#006699", dayfast: "#5CE68A", dayslow: "#5CE68A", slowcoast: "#5CE68A", coastal: "#5CE68A", upstream: "#5C85FF", downstream: "#5C85FF", fastup: "#99E6FF", fastdown: "#99E6FF", ferry: "#5CE68A"}

  modeHash = {hires: "Road (High Resolution)", road: "Road", overseas: "Open Sea (fast)",slowover: "Open Sea (slow)", dayfast: "Coastal (fast, daytime only)", dayslow: "Coastal (slow, daytime only)", slowcoast: "Coastal (slow)", coastal: "Coastal (fast)", upstream: "River (Civilian)", downstream: "River (Civilian)", fastup: "River (Military)", fastdown: "River (Military)", ferry: "Ferry", self: "Self Loop"}

window.onkeyup = function(e) {
   var key = e.keyCode ? e.keyCode : e.which;
   if (key == 27) {
    closeEssay();
   }
}

svg = d3.select("#vizcontainer").append("svg")
    .attr("id", "mapSVG")
    .attr("width", "100%")
    .attr("height", "100%")
    .on("click", function() {d3.select(".modal").style("display", "none")})
    .on("mousedown", function() {d3.select(this).style("cursor", "move")})
    .on("mouseup", function() {d3.select(this).style("cursor", "default")})
	;

height = parseFloat(document.getElementById("mapSVG").clientHeight || document.getElementById("mapSVG").parentNode.clientHeight);
width = parseFloat(document.getElementById("mapSVG").clientWidth || document.getElementById("mapSVG").parentNode.clientWidth);

tile = d3.geo.tile()
    .size([width, height]);

projection = d3.geo.mercator()
    .scale((1 << 13) / 2 / Math.PI)
    .translate([width / 2, height / 2]);

center = projection([12, 42]);

path = d3.geo.path()
    .projection(projection);

brush = d3.svg.brush()
    .x(d3.scale.identity().domain([0, width]))
    .y(d3.scale.identity().domain([0, height]))
    .extent([[100, 100], [200, 200]])
    .on("brush", brushed);

zoom = d3.behavior.zoom()
    .scale(projection.scale() * 2 * Math.PI)
    .scaleExtent([1 << 11, 1 << 17])
    .translate([width - center[0], height - center[1]])
    .on("zoom", zoomed)
    .on("zoomstart", zoomInitialize)
    .on("zoomend", zoomComplete)
    ;

projection
    .scale(1 / 2 / Math.PI)
    .translate([0, 0]);

raster = svg.append("g").attr("id", "rasterG")

brushG = svg.append("g")
    .attr("class", "brush")
    .style("display", "none")
    .call(brush);

svg.append("g")
    .attr("class", "zoom")
    .call(zoom)
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("opacity", 0);

//Class-based button functions

d3.selectAll(".tab").each(function() {
  addedFunction = "d3.select(this.parentNode).selectAll('.tab').classed('backtab',true);d3.select(this).classed('backtab', false);"
  combinedFunction = addedFunction + d3.select(this).attr("onclick");
  d3.select(this).attr("onclick", combinedFunction);
})

d3.selectAll(".navTab").on("click", function() {createEssay(d3.select(this).attr("data"))})

d3.selectAll(".helpicon").on("mouseover", function() {contextualHelp(d3.select(this).attr("data"))}).on("mouseout", hideInfoPopup)

colorRamp=d3.scale.linear().domain([0,1,5,10]).range(["#004e99","#7e8fc3","#c28711","#ad5041"])

d3.json("new_routes.topojson", function(error, routes) {

d3.json("topocoast.json", function(error, coast) {
  exposedCoast = coast;
})

  exposedroutes = routes;
  exposedGeoms = topojson.feature(routes, routes.objects.base_routes).features;

  routeG = svg.append("g").attr("id", "routesContainer")

  routeG.selectAll(".routes")
  .data(topojson.feature(routes, routes.objects.base_routes).features)
  .enter()
  .append("path")
  .attr("class", "routes links")
  .attr("d", path)
  .style("stroke-linecap", "round")
  .style("stroke", function(d) {return typeHash[d.properties.t]});

simplifiedGeoms = simplifyLines(d3.selectAll("path.routes"));

  routeG.selectAll(".routes")
  .data(simplifiedGeoms)
  .attr("d", path)
  
  refreshTimer = setTimeout('zoomComplete()', 100);

d3.csv("o_sites.csv", function(error, sites) {
  exposedsites = sites;
  siteHash = {};
  siteLabelHash = {};
  svg.append("g").attr("id","hullsG")
        .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
  svg.insert("g", "#sitesG").attr("id", "resultsG")
  var sitesG = svg.append("g").attr("id","sitesG")
        .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
  for (x in exposedsites) {
    if(exposedsites[x]) {
      //Make this attribute an array to hold all the costs you've run
      exposedsites[x].cost = [];
      exposedsites[x].nearestCluster = 0;
      exposedsites[x].betweenness = 0;
      exposedsites[x].fixedColor = '#ad5041'
      siteHash[exposedsites[x].id] = exposedsites[x];
      siteLabelHash[exposedsites[x].label] = exposedsites[x].id;
    }
  }
  siteHash[999] = {id: 999, label: "ERROR"}
  
    exposedroutes.objects.base_routes.geometries.forEach(function(el) {

      //Adjust for metanodes
      if (el.properties.t == "road") {
	var oldS = el.properties.sid;
	el.properties.sid = el.properties.tid;
	el.properties.tid = oldS;
      }
      var realSource = el.properties.sid.toString().length == 6 ? el.properties.sid.toString().substring(1,6) : el.properties.sid;
      var realTarget = el.properties.tid.toString().length == 6 ? el.properties.tid.toString().substring(1,6) : el.properties.tid;
      
      el.properties.source = siteHash[realSource];
      el.properties.target = siteHash[realTarget];
      el.properties.fixedWidth = 2;
      el.properties.fixedColor = typeHash[el.properties.t];
      
    })
    
    d3.selectAll(".routes").filter(function(el) {return el.properties.source == undefined || el.properties.target == undefined ? this : null}).remove();


  exposedsites.sort(function(a,b) {
    if (a.label > b.label)
    return 1;
    if (a.label < b.label)
    return -1;
    return 0;
    });
  var osites = sitesG.selectAll(".site")
  .data(exposedsites.filter(function(d) {return d.rank > 10}))
  .enter()
  .append("g")
  .attr("id", function(d) {return "site_g_" + d.id})
  .attr("class", "site")
  .attr("transform", function(d) {return "translate(" + projection([d.x,d.y]) + ")scale(" + projection.scale() + ")"})
  .style("cursor", "pointer")
  .on("click", siteClick)
  .on("mouseover", function(d,i) {siteOver(d,i,this)})
  .on("mouseout", siteOut)
  .each(function(d) {
    d.cartoTranslate = "translate(" + projection([d.x,d.y]) + ")scale(" + projection.scale() + ")";
  });

    var minX = 100;
    var maxX = -100;
    var minY = 100;
    var maxY = -100;

  for (x in exposedsites) {
    
    var projo = projection([exposedsites[x].x,exposedsites[x].y]);
    
    if (projo[0] < minX) {
      minX = projo[0]
    }
    if (projo[0] > maxX) {
      maxX = projo[0]
    }
    if (projo[1] < minY) {
      minY = projo[1]
    }
    if (projo[1] > maxY) {
      maxY = projo[1]
    }
  }
  
  mainXRamp = d3.scale.linear().domain([0,960]).range([minX,maxX]);
  mainYRamp = d3.scale.linear().domain([0,960]).range([minY,maxY]);
  
  osites
  .append("circle")
  .attr("r", scaled(40))
  .style("fill", "white")
  .style("stroke-width", scaled(1))
  .style("stroke", "black")
  .style("stroke-width", scaled(1))
  .attr("class", "sitecirc")

  osites
  .append("circle")
  .attr("r", scaled(35))
  .style("fill", "#ad5041")
  .attr("class", "sitecirctop")
  .attr("id", function(d,i) {return "sct" + d.id})


var initialLabels = [50024,50017,50107,50429,50235,50129,50327,50359,50379,50124,50549,50213]
for (x in initialLabels) {
document.getElementById("site_g_"+initialLabels[x]).parentNode.appendChild(document.getElementById("site_g_"+initialLabels[x]));
siteLabel("site_g_"+initialLabels[x]);
}

  d3.select("#resultsG").selectAll("path.results")
    .data(routeSegments)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "results")

    zoomInitialize();
    zoomComplete();
  continueLoading();
})
});
}
function continueLoading() {
  
  d3.selectAll("svg.eye").append("path").attr("d", "m 8.3342783,-0.10566667 c -0.1151472,-0.0123197 -0.2314451,-0.0198757 -0.3490568,-0.0198757 -0.00162,0 -0.00231,0 -0.00231,0 0,0 0,0 -0.00114,0 -0.1194186,0 -0.2367014,0.007556 -0.3529987,0.0198757 C 3.1976365,0.10557429 1.0873623,4.1416567 1.0873623,4.1416567 c 0,0 2.2173731,4.2655563 6.8957201,4.2655563 4.6763756,0 6.8924346,-4.265392 6.8924346,-4.265392 0,0 -2.109782,-4.03624671 -6.5412427,-4.24748767 z M 6.8554275,1.9863746 c 0.5069127,0 0.9177322,0.4106551 0.9177322,0.9165822 0,0.5070768 -0.4108195,0.9188817 -0.9177322,0.9188817 -0.5062556,0 -0.9165821,-0.4118049 -0.9165821,-0.9188817 -1.643e-4,-0.5059271 0.410162,-0.9165822 0.9165821,-0.9165822 z m 1.1276589,5.2080918 c -2.971993,0 -4.778711,-2.0232152 -5.5057348,-3.0526454 C 2.9141244,3.5218961 3.7467686,2.5419088 4.9889181,1.8595644 4.8243275,2.2475512 4.7341477,2.674961 4.7341477,3.1222466 c 0,1.794234 1.4535546,3.2486098 3.2476243,3.2486098 1.7945629,0 3.248446,-1.4543758 3.248446,-3.2486098 0,-0.4448217 -0.09051,-0.869439 -0.252471,-1.2557833 1.236729,0.6828373 2.070688,1.6598678 2.50861,2.2763433 -0.726695,1.0282802 -2.533742,3.0516598 -5.5032706,3.0516598 z").style("stroke", "none").style("fill", "black")
    d3.select("#borderOnButton").select("svg").select("path").style("fill", "gray");

  var sBut = d3.select("#sourceSelectParent");
  temporaryLabels(true);

  sBut.append("select")
    .attr("id", "sourceSelectButton")
    .attr("class", "controlButton")
    .selectAll("option")
  .data(exposedsites.filter(function (el) {return el.label != "x"}))
  .enter()
  .append("option")
  .style("display", function(d) {return d.label == "x" ? "none" : "block"})
  .html(function(d) {return d.label})
  .attr("value", function(d) {return d.id})

  d3.select("#targetSelectButton").selectAll("option")
  .data(exposedsites.filter(function (el) {return el.label != "x"}))
  .enter()
  .append("option")
  .style("display", function(d) {return d.label == "x" ? "none" : "block"})
  .html(function(d) {return d.label})
  .attr("value", function(d) {return d.id})

  changePriority("f");
  
  document.getElementById("sourceSelectButton").value = 50327;
  document.getElementById("targetSelectButton").value = 50129;
  
  $("#sourceSelectButton").chosen();
  $("#targetSelectButton").chosen();
  d3.select("#sourceSelectButton_chosen").style("width", "215px");
  d3.select("#targetSelectButton_chosen").style("width", "215px");
  createEssay("home");
  var sa =  [50024,50017,50107,50429,50235,50129,50327,50359,50379,50124,50549,50213];
  var r = sa[Math.floor(Math.random()*12)];
  cartogram(r);
  document.getElementById("sourceSelectButton").value = r;$("#sourceSelectButton").trigger("chosen:updated");

  var iS = sa.indexOf(r);
  sa.splice(iS, 1);

  r = sa[Math.floor(Math.random()*11)]
  document.getElementById("targetSelectButton").value = r;$("#targetSelectButton").trigger("chosen:updated");

  resizeMap();
  
  d3.select("#cartoOffMenu").style("display", "none");
  d3.select("#voroOffMenu").style("display", "none");

  !function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');

}

function zoomComplete() {
  zoomed();
  d3.selectAll(".routes")
      .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
      .style("stroke", function(d) {return d.properties.fixedColor})
      .style("stroke-width", function(d) {return scaled(d.properties.fixedWidth)})

  d3.selectAll(".results").style("display", "block")
      .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
      .style("stroke", function(d) {return d.properties.fixedColor})
      .style("stroke-width", scaled(6));

  d3.selectAll(".resultsOutline").style("display", "block")
      .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
      .style("stroke", "black")
      .style("stroke-width", scaled(10));

}
function zoomInitialize() {
  var downloadButton = d3.select("#svgDownload").style("display", "none");
  d3.select('#infopopup').style('display','none');
  d3.selectAll("g.site").attr("display", function(d) {return zoomDisplayRange(zoom.scale()) < d.rank || dotStyle == true ? "block" : "none"});
  if (displaySites == false) {
    d3.selectAll("g.site").selectAll("circle").style("display", "none")
  }
  else {
    d3.selectAll("g.site").selectAll("circle").style("display", "block")
  }
 zoomed(); 
}

function zoomed() {

  if (voronoiRunning == true) {
    d3.selectAll("path.voronoi")
    .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
    .style("stroke-width", scaled(1));
    d3.selectAll(".voronoi-cell")
    .style("stroke-width", scaled(1))
    .style("stroke-dasharray", scaled(5) +","+ scaled(5));
  }

  var tiles = tile
      .scale(zoom.scale())
      .translate(zoom.translate())
      ();

  var image = raster
      .attr("transform", "scale(" + tiles.scale + ")translate(" + tiles.translate + ")")
    .selectAll("image")
      .data(tiles, function(d) { return d; });

  image.exit()
      .remove();

  image.enter().append("image")
      .attr("xlink:href", function(d) { return "http://" + ["a", "b", "c", "d"][Math.random() * 4 | 0] + ".tiles.mapbox.com/v3/elijahmeeks.map-ktkeam22/" + d[2] + "/" + d[0] + "/" + d[1] + ".png"; })
      .attr("width", 1)
      .attr("height", 1)
      .attr("x", function(d) { return d[0]; })
      .attr("y", function(d) { return d[1]; });

d3.select("#hullsG")
    .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
    .selectAll("path")
    .style("stroke-width", scaled(2))

    d3.select("#sitesG")
    .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");

    if (dotStyle == true) {
      d3.selectAll(".sitecirc").attr("r", scaled(10)).style("fill", "black");
      d3.selectAll(".sitecirctop").attr("r", 0);

    }
    else {
d3.selectAll(".sitecirc")
  .attr("r", function(d) {return scaled(siteSize(d.rank))})
  .style("stroke-width", scaled(4))
  .style("fill", "white")

d3.selectAll(".sitecirctop")
  .attr("r", function(d) {return scaled(siteSize(d.rank) - 4)})
  ;

  d3.selectAll(".sourcecirc")
  .attr("r", function(d) {return scaled(siteSize(d.rank) + 10)})
  .style("stroke-width", scaled(8))

d3.selectAll(".targetcirc")
  .attr("r", function(d) {return scaled(siteSize(d.rank) + 4)})
  .style("stroke-width", scaled(14))
    }

  d3.selectAll(".hoverlabel")
  .attr("x", scaled(2))
  .attr("y", scaled(-60))
  .style("font-size", scaled(100))
  .style("stroke-width", scaled(25));

d3.selectAll(".slabel")
  .attr("x", scaled(2))
  .attr("y", scaled(-60))
  .style("font-size", function() {return d3.select(this).classed("underlined") ? scaled(150) : scaled(100)})
  .style("stroke-width", scaled(25))
  .each(function() {d3.select(this.parentNode).style("display", "block")});

d3.selectAll(".pslabel")
  .attr("x", scaled(2))
  .attr("y", scaled(60))
  .style("font-size", scaled(80))
  .style("stroke-width", scaled(25))
  .each(function() {d3.select(this.parentNode).style("display", "block")});
    
  d3.selectAll(".routes").filter(function(d) {return activeBGTypes.indexOf(d.properties.t) == -1}).style("display", "none");
  d3.selectAll(".routes").filter(function(d) {return activeBGTypes.indexOf(d.properties.t) > -1}).style("display", "block");

  if (cartogramRunning) {
    d3.selectAll("g.site").filter(function(d) {return d.cost[lastCartoRan] == -1}).style("display", "none");
    d3.selectAll("path.links").style("display", function(d) {return cartogramsRun[lastCartoRan].modeArr.indexOf(d.properties.t) == -1 || d.properties.source.cost[lastCartoRan] == -1 || d.properties.target.cost[lastCartoRan] == -1 || !networkOn ? "none" : "block"})
  }
  else if (!networkOn) {
    d3.selectAll("path.links").style("display", "none")
  }

    d3.selectAll(".routes")
      .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
      .style("stroke-width", function(d) {return scaled(2)});
  
    d3.selectAll(".results").style("display", "none");
  d3.selectAll(".resultsOutline").style("display", "none");
  d3.selectAll(".modal").style("display", "none");
  
}

function colorBy(attribute) {
  var oSc = fastestScale;
  if (attribute == "e") {
    oSc = cheapestScale;
  }
  resetButtons("routeLabelButton");
  d3.select("#"+attribute+"Button").classed("active", true);
  var max = d3.max(exposedroutes.objects.base_routes.geometries, function(d) {return d.properties[attribute]})
  colorRamp=d3.scale.quantize().domain([max,0]).range(oSc);
  d3.selectAll(".routes")
  .transition().duration(500).style("stroke", function(d) {return colorRamp(d.properties[attribute])})
}

function colorByType(instant) {
  resetButtons("routeLabelButton");
  d3.select("#tButton").classed("active", true)
  if (!instant) {
  d3.selectAll("path.routes")
  .transition().duration(500).style("stroke", function(d) {return typeHash[d.properties.t]})
  }
  else {
  d3.selectAll("path.routes").style("stroke", function(d) {return typeHash[d.properties.t]})    
  }
}
function siteClick(d,i) {
  d3.event.stopPropagation();
  var coords = d3.mouse(document.body);

    var modalContents = d3.select("#sitemodal").style("display", "block").style("left", (coords[0] - 30) + "px").style("top", (coords[1]) + "px").html('')

    modalContents.append("div").attr("class", "siteButton").style("left", "-100px").style("top", "-100px").attr("id","showLabelButton").style("display","none").html("<button onclick='siteLabel(\"site_g_"+d.id+"\")'>Display Label</button>")
    modalContents.append("div").attr("class", "siteButton").style("left", "-100px").style("top", "-100px").attr("id","hideLabelButton").style("display","none").html("<button onclick='removeSiteLabel(\"site_g_"+d.id+"\")'>Remove Label</button>")

  if (d3.select("#site_g_"+d.id).selectAll(".slabel").empty()) {
    d3.select("#showLabelButton").style("display","block")
  }
  else {
    d3.select("#hideLabelButton").style("display","block")
  }
  modalContents.append("div").attr("class", "siteButton").style("left", "100px").style("top", "-100px").html("<button id='incExcButton'>" + (excludedSites.indexOf(d.id) > -1 ? "Include Site" : "Exclude Site") + "</button>").on("click", function() {onOffSite(d)})
  modalContents.append("div").attr("class", "siteButton").style("left", "100px").style("top", "-50px").append("button").html("Route from here").on("click", function() {switchControls('route');document.getElementById("sourceSelectButton").value = d.id;$("#sourceSelectButton").trigger("chosen:updated");})
  modalContents.append("div").attr("class", "siteButton").style("left", "100px").style("top", "0px").append("button").html("Route to here").on("click", function() {switchControls('route');document.getElementById("targetSelectButton").value = d.id;$("#targetSelectButton").trigger("chosen:updated");})
  
  modalContents.append("div").attr("class", "siteButton").style("left", "-100px").style("top", "0px").html("<button onclick='d3.select(\"#controlbar\").selectAll(\".tab\").classed(\"backtab\",true);d3.select(\"#cartTab\").classed(\"backtab\",false);switchControls(\"cartogram\");d3.select(this).remove();cartogram("+d.id+")'>Network</button>")
  modalContents.append("div").attr("class", "siteButton").style("left", "-100px").style("top", "50px").html("<button onclick='d3.select(\"#controlbar\").selectAll(\".tab\").classed(\"backtab\",true);d3.select(\"#minTab\").classed(\"backtab\",false);switchControls(\"Minard\");d3.select(this).remove();geoSankey("+d.id+")'>Flow</button>")
  modalContents.append("div").attr("class", "siteButton").style("left", "0").style("top", "50px").append("button").on("click", function() {moreSiteDetails(d)}).html("Site Details")

}

function moreSiteDetails(d) {
  d3.select("#siteDetailsModal").style("display", "block");
  d3.select("#siteTitle").html(d.label);
  var netInfo = d3.select("#siteNetworks > .srContent").selectAll("div.netInfo").data(d.cost);
  netInfo.enter().append("div").attr("class", "netInfo");
  netInfo.exit().remove();
  netInfo
  .style("color", function (p,q) {return priorityColor[cartogramsRun[q].priority]})
  .html(function(p,q) {return "Distance " + directionHash[cartogramsRun[q].direction] + " " + siteHash[cartogramsRun[q].centerID].label + ": " + p + " " + priorityName[cartogramsRun[q].priority]})
  .on("click", function (p,q) {runCarto(siteHash[cartogramsRun[q].centerID].x,siteHash[cartogramsRun[q].centerID].y,cartogramsRun[q].centerID,q);});
  
  var sourceRoutes = d3.entries(routesRun).filter(function (p) {return p.value.source == d.id});
  var targetRoutes = d3.entries(routesRun).filter(function (p) {return p.value.target == d.id});

  var sourceInfo = d3.select("#fromRoutes").selectAll("div.netInfo").data(sourceRoutes);
  sourceInfo.enter().append("div").attr("class", "netInfo");
  sourceInfo.exit().remove();
  sourceInfo
  .html(function(p,q) {return "to " + siteHash[p.value.target].label})
  .style("color", function (p,q) {return priorityColor[p.value.priority]})
  .on("click", function (p,q) {populateRouteDialogue(p.key)});

  var targetInfo = d3.select("#toRoutes").selectAll("div.netInfo").data(targetRoutes);
  targetInfo.enter().append("div").attr("class", "netInfo");
  targetInfo.exit().remove();
  targetInfo
  .html(function(p,q) {return "from " + siteHash[p.value.source].label})
  .style("color", function (p,q) {return priorityColor[p.value.priority]})
  .on("click", function (p,q) {populateRouteDialogue(p.key)});

  var throughPossibilities = d3.selectAll(".results").data().filter(function(p) {return p.properties.source == d || p.properties.target == d}).map(function (p) {return p.properties.routeID});
  throughPossibilities = throughPossibilities.filter(function (p) {return sourceRoutes.map(function(j) {return parseInt(j.key)}).indexOf(p) == -1 && targetRoutes.map(function(j) {return parseInt(j.key)}).indexOf(p) == -1})
  var throughRoutes = d3.entries(routesRun).filter(function (p) {return throughPossibilities.indexOf(parseInt(p.key)) > -1})

  var throughInfo = d3.select("#throughRoutes").selectAll("div.netInfo").data(throughRoutes);
  throughInfo.enter().append("div").attr("class", "netInfo");
  throughInfo.exit().remove();
  throughInfo
  .html(function(p,q) {return siteHash[p.value.source].label + " to " + siteHash[p.value.target].label})
  .style("color", function (p,q) {return priorityColor[p.value.priority]})
  .on("click", function (p,q) {populateRouteDialogue(p.key)});
}


function siteOver(d,i,ext) {
    ext.parentNode.appendChild(ext);
  

  if (!d3.select(ext).select("text").empty()) {
    return;
  }
  if (tempLabels == false) {
  d3.select("#site_g_"+d.id).append('text').attr("class","hoverlabel").text(d.label)
  .attr("x", scaled(2))
  .attr("y", scaled(-60))
  .attr("font-size", scaled(100))
  .attr("text-anchor", "middle")
  .style("stroke-width", scaled(25))
  .style("stroke", "white")
  .style("opacity", .75)
  .style("pointer-events","none");
  d3.select("#site_g_"+d.id).append('text').attr("class","hoverlabel").text(d.label)
  .attr("x", scaled(2))
  .attr("y", scaled(-60))
  .attr("font-size", scaled(100))
  .attr("text-anchor", "middle")
  .style("pointer-events","none")
  .style("stroke", "none");
  }
}

function siteOut(d,i) {
//  d3.select("#site_g_"+d.id+"_label").transition().duration(500).style("stroke-width", scaled(25));

  if (tempLabels == false) {
  d3.selectAll(".hoverlabel").remove();
  }
  d3.selectAll("g.site").each(function() {
    d3.select(this).selectAll("text").size() > 0 ? this.parentNode.appendChild(this) : null;
  })
}

function siteLabel(siteID, underlined) {
  var xC = "";
  var xF = 100
  if (underlined){
    removeSiteLabel(siteID);
    xC = " underlined";
    xF = 150;
    d3.select("#"+siteID).node().parentNode.appendChild(d3.select("#"+siteID).node());
    d3.select("#"+siteID).select(".sitecirc").classed("sourcecirc", "true");

  }
  d3.select("#showLabelButton").style("display","none")
  d3.select("#hideLabelButton").style("display","block")
  d3.select("#"+siteID).append('text').attr("class","slabel" + xC).text(function(d) {return d.label})
  .attr("x", scaled(2))
  .attr("y", scaled(-60))
  .attr("font-size", scaled(xF))
  .attr("text-anchor", "middle")
  .attr("id", siteID + "_label")
  .style("stroke-width", scaled(25))
  .style("stroke", "white")
  .style("opacity", .75)
  .style("pointer-events","none");
  d3.select("#"+siteID).append('text').attr("class","slabel" + xC).text(function(d) {return d.label})
  .attr("x", scaled(2))
  .attr("y", scaled(-60))
  .attr("font-size", scaled(xF))
  .attr("text-anchor", "middle")
  .style("pointer-events","none")
  .style("stroke", "none");
}

function removeSiteLabel(siteID) {
  d3.select("#showLabelButton").style("display","block")
  d3.select("#hideLabelButton").style("display","none")
  d3.select("#"+siteID).selectAll('text').remove();
}


function resetButtons(buttonClass) {
  d3.selectAll("." + buttonClass).classed("active", false);  
}

function priorityClick(button) {
  resetButtons("priorityButton");
  d3.select(button).classed("active", true);
}

function flipButton(button) {
  d3.select(button).classed("active") == true ? d3.select(button).classed("active", false) : d3.select(button).classed("active", true);
}

function aquaticOptions(button) {
  switch(button.innerHTML)
  {
    case 'Civilian River':
    button.innerHTML = 'Military River';
    button.value = 'civriver';
    break;
    case 'Military River':
    button.innerHTML = 'Civilian River';
    button.value = 'milriver';
    break;
    case 'Fast Sea':
    button.innerHTML = 'Slow Sea';
    button.value = 'fastsea';
    break;
    case 'Slow Sea':
    button.innerHTML = 'Fast Sea';
    button.value = 'slowsea';
    break;
  }
  
}

function cartogram(centerID) {
  
  var centerX = siteHash[centerID].x;
  var centerY = siteHash[centerID].y;
  
  var newSettings = getSettings();
  newSettings["centerID"] = parseInt(centerID);
  newSettings["source"] = null;
  newSettings["target"] = null;
  
  var exists = cartogramsRun.map(function(d){return JSON.stringify(d)}).indexOf(JSON.stringify(newSettings));
  if (exists > -1) {
    runCarto(siteHash[cartogramsRun[exists].centerID].x,siteHash[cartogramsRun[exists].centerID].y,cartogramsRun[exists].centerID,exists);
    return;
  }
  
    cartogramsRun.push(newSettings)

    d3.select(".calculateDisable").style("display", "block");
  cartoQuery = "new_carto.php?v="+newSettings.vehicle+"&m="+newSettings.month+"&c="+centerID+"&tr="+newSettings.riverTransfer+"&ts="+newSettings.seaTransfer+"&p="+newSettings.priority+"&ml="+newSettings.modes+"&el="+newSettings.excluded+"&d="+newSettings.direction;
  d3.selectAll("span.emptyHistory").remove();
  _gaq.push(['_trackEvent', 'query', "cartogram", centerID]);
  
  d3.csv(cartoQuery, function(error,cartoData) {
    d3.select(".calculateDisable").style("display", "none");
  exposedCarto = cartoData;

  for (x in exposedsites) {
    if(exposedsites[x]) {
      for (y in cartoData) {
        if (cartoData[y].target == exposedsites[x].id) {
          exposedsites[x].cost.push(parseFloat(cartoData[y].cost));
          break;
        }
      }
    }
  }
  
  runCarto(centerX,centerY,centerID, cartogramsRun.length - 1);

  if (!firstRun) {
    addCartoRow(newSettings);
  }
  else {
    
    cartogramsRun[0].centerID = 999;
    cartogramsRun[0].priority = 9;
    firstRun = false;
  }

  })


}

function updateSiteLegend() {
  if (clusterRunning == false) {
    d3.selectAll(".sitecirctop")
  .style("fill", function(d) { return d.cost[lastCartoRan] == -1 ? "gray" : (cartoLegend.scale(d["cost"][lastCartoRan]))});
  }
  if (voronoiRunning == true) {
    clearVoronoi();
    createVoronoi();
  }
}

function runCarto(centerX,centerY,centerID, cartoPosition) {
  clusterRunning = false;
  if (cartogramRunning) {
    cartogramOff();
  }

  lastCartoRan = cartoPosition;
  d3.selectAll(".slabel").classed("underlined", false).style("font-size", scaled(100));
  d3.selectAll(".sitecirc").classed("sourcecirc", false);
  d3.selectAll(".sitecirc").classed("targetcirc", false);
  siteLabel("site_g_"+centerID,true);

  d3.select("#sitemodal").style("display", "none");
  d3.select("#hullButton").style("display","none");
  
  max = d3.max(exposedsites, function(el) {return el["cost"][cartoPosition]});
  mid = max / 2;

  var oSc = orbisColorScale;
  var fSc = [500,1000,2000,3000,9e9]
  var cS = .5;

  switch (parseInt(cartogramsRun[cartoPosition].priority)) {
    case 0:
      oSc = fastestScale;
      fSc = [7,14,21,28,9e9]
      break;
    case 1:
      oSc = cheapestScale;
      fSc = [1,2.5,5,10,9e9]
      break;
    case 2:
      cS = 100;
      oSc = shortestScale;
  }

  cartoRamp=d3.scale.threshold().domain(fSc).range(oSc);
  var costramp=d3.scale.linear().domain([0,max]).range([0,1]);

  clearBottom();

  d3.select("#timelineViz").style("display", "block")
  var canvWidth = parseInt(d3.select("#timelineViz").style("width")) - 460;
  d3.select("#timelineSVG").attr("width", canvWidth)
  
  cartoLegend = d3.svg.legend().units(priorityName[cartogramsRun[cartoPosition].priority]).cellWidth(80).cellHeight(25).inputScale(cartoRamp).cellStepping(cS);
  d3.select('#routeResults').style('display','block');
  d3.select('#legendDisplayButton').style('display','none');

  var topFiveSites = exposedsites.filter(function (d) {return d.rank > 91}).sort(function(a,b) {
    if (a.cost[lastCartoRan] < b.cost[lastCartoRan])
    return 1;
    if (a.cost[lastCartoRan] > b.cost[lastCartoRan])
    return -1;
    return 0;
    }).slice(0,4)
  
  var f = d3.format(",.0f");
  
  var routeModalContents = d3.select("#routeResults").html('')
  var leftDiv = routeModalContents.append("div").attr("class", "rrLeft").style("width", "220px")
  var midDiv = routeModalContents.append("div").attr("class", "rrMid").style("width", "230px")
  var rightDiv = routeModalContents.append("div").attr("class", "rrRight").style("width", "95px")
  leftDiv.append("p").html("According to the " + priorityType[cartogramsRun[cartoPosition].priority] + " routes "+ directionHash[cartogramsRun[cartoPosition].direction].toLowerCase() +" <span class='boldRed'>" + siteHash[centerID].label + "</span> to the rest of the Roman world in <span class='bold'>" + monthNames[cartogramsRun[cartoPosition].month] + "</span>, sites are this far away.")
  rightDiv.html('<button class="legendButton" style="font-size:16px;width:110px;font-weight:700;" id="cartoInLegend" onmouseover="contextualHelp(\'cartogramon\')" onmouseout="hideInfoPopup()">Cartogram</button><div style="margin:0;font-size:16px;width:110px;font-weight:700;' + (cartogramRunning ? '' : 'display:none;') + '" id="cartoOffButton"><button class="legendButton" style="font-size:16px;width:110px;font-weight:700;" onclick="cartogramOff()" onmouseover="contextualHelp(\'georectify\')" onmouseout="hideInfoPopup()">Georectify</button></div><button class="legendButton" style="font-size:16px;width:110px;font-weight:700;" onclick="createVoronoi();" onmouseover="contextualHelp(\'voronoi\')" onmouseout="hideInfoPopup()">Zones</button>')
  midDiv.append("p").html("The most distant major sites are:").style("padding-bottom", "0")
  var rrList = midDiv.append("ul").style("margin-top", "0")
  rrList.selectAll("li").data(topFiveSites).enter().append("li")
  .html(function (d) {return d.label + " (" + f(d.cost[lastCartoRan]) + " " + priorityName[cartogramsRun[cartoPosition].priority] + ")"})
  
  
  d3.select("g.legend").selectAll("g")
  .on("mouseover", function (d) {d3.selectAll("g.Voronoi")
      .filter(function (p) {return p.color == d.color}).style("opacity", 1);
  })
  .on("mouseout", function () {d3.selectAll("g.Voronoi").style("opacity", .8);
  })
  ;
  exposedsites.forEach(function (d) {
    if (d.cost[lastCartoRan] == -1) {
      d.fixedColor = "lightgray"
    }
    else {
      d.fixedColor = cartoRamp(d["cost"][cartoPosition]);
    }
  })
  svg.selectAll(".sitecirctop").filter(function(d) {return d.cost[lastCartoRan] == -1 ? null : this})
  .style("fill", function(d) { return (cartoRamp(d["cost"][cartoPosition]))});

  d3.select("#timelineSVG").append("g").attr("transform", "translate(50,70)").attr("class", "legend").call(cartoLegend);
  d3.select("#timelineViz").insert("div", ".tab").attr("id", "lTitle").html("<div style='margin:10px;font-size:24px;width:100%;'>Distance " + directionHash[cartogramsRun[cartoPosition].direction] + " " + siteHash[centerID].label +'<p>')
  
  d3.selectAll("g.site").filter(function(d) {return d.cost[lastCartoRan] == -1 ? this : null}).select(".sitecirctop").style("fill", "lightgray")

  d3.select("#cartoOnButton").on("click", function() {cartogramOn(cartoPosition,centerX,centerY)}).style("display", "block");
  d3.select("#cartoInLegend").on("click", function() {cartogramOn(cartoPosition,centerX,centerY)});
  zoomComplete();

}

function cartogramOn(cartoPosition, centerX,centerY,noDelay) {
  _gaq.push(['_trackEvent', 'interaction', "cartogram", "cartogram"]);
  d3.select("#cartoOffMenu").style("display", "block");
  clearVoronoi();
  cartogramRunning = true;
  var minX = d3.min(exposedsites, function(el) {return projection([el.x,el.y])[0]})
  var maxX = d3.max(exposedsites, function(el) {return projection([el.x,el.y])[0]})
  var minY = d3.min(exposedsites, function(el) {return projection([el.x,el.y])[1]})
  var maxY = d3.max(exposedsites, function(el) {return projection([el.x,el.y])[1]})
  var xramp=d3.scale.linear().domain([minX,maxX]).range([0,960]);
  var yramp=d3.scale.linear().domain([minY,maxY]).range([0,960]);
  var costramp=d3.scale.linear().domain([0,max]).range([0,1000]);

    function findx(costin, thisx, thisy, cenx, ceny)
  {
    var projectedCoordsThis = projection([thisx,thisy]);
    var projectedCoordsCen = projection([cenx,ceny]);
    var xdiff = xramp(projectedCoordsThis[0]) - xramp(projectedCoordsCen[0]) + .00001;
    var ydiff = yramp(projectedCoordsThis[1]) - yramp(projectedCoordsCen[1]) + .00001;		
    var hypotenuse = Math.sqrt((Math.pow(xdiff,2)) + (Math.pow(ydiff,2)));
    var ratio = costramp(costin) / hypotenuse;
    return (ratio * xdiff * .0001) + projectedCoordsCen[0];
  }

  function findy(costin, thisx, thisy, cenx, ceny) {
    var projectedCoordsThis = projection([thisx,thisy]);
    var projectedCoordsCen = projection([cenx,ceny]);
    var xdiff = xramp(projectedCoordsThis[0]) - xramp(projectedCoordsCen[0]) + .00001;
    var ydiff = yramp(projectedCoordsThis[1]) - yramp(projectedCoordsCen[1]) + .00001;		
    var hypotenuse = Math.sqrt(Math.pow(xdiff,2) + Math.pow(ydiff,2));
    var ratio = costramp(costin) / hypotenuse;
    return (ratio * ydiff * .0001) + projectedCoordsCen[1];
  }

  svg.selectAll("g.site")
  .each(function(d) {
    d.cartoTranslate = "translate("+ (findx(d["cost"][cartoPosition],d.x,d.y,centerX,centerY))  + "," + (findy(d["cost"][cartoPosition],d.x,d.y,centerX,centerY)) + ")scale(.159)";
  })
    d3.selectAll("path.links").each(function(d) {
    var xposition = -1;
    var yposition = -1;
  var lineLength = d.coordinates.length - 1;
  var cartoRamp = d3.scale.linear().range([d.properties.source["cost"][cartoPosition],d.properties.target["cost"][cartoPosition]]).domain([0, lineLength]);
  d.cartocoords = d.coordinates.map(function(d,i) {return [findx(cartoRamp(i),d[0],d[1],centerX,centerY),findy(cartoRamp(i),d[0],d[1],centerX,centerY)]});
  cartoPath =
  d3.svg.line()
  .x(function(p) {return p[0]})
  .y(function(p) {return p[1]});
  
  d.cartoD = cartoPath(d.cartocoords);
  })

  
  if (noDelay) {
    d3.selectAll(".links").attr("d", function(d) {return (d.cartoD ? d.cartoD : "")})
  }

  else{
  d3.select("#rasterG").transition().duration(3000).style("opacity", .5);
    svg.selectAll("g.site")
  .transition()
  .duration(3000)
  .attr("transform", function(d) {return d.cartoTranslate;});
  
  d3.selectAll(".links").transition().duration(3000).attr("d", function(d) {return (d.cartoD ? d.cartoD : "")})
  d3.select("#cartoOffButton").style("display", "inline");
    if (psEffects == true) {
      drawBorders();
  }
  }
zoomComplete();
}

function cartogramOff() {
    d3.select("#cartoOffMenu").style("display", "none");
  clearVoronoi();
  d3.select("#sitemodal").style("display", "none");
  cartogramRunning = false;
  d3.select("#rasterG").transition().duration(3000).style("opacity", 1);

  d3.selectAll("g.site").filter(function(d) {return d.cost[lastCartoRan] == -1 ? this : null}).select(".sitecirctop").style("fill", "lightgray")

  d3.selectAll("g.site")
  .transition()
  .duration(3000)
  .attr("transform", function(d) {return "translate(" + projection([d.x,d.y]) + ")scale(" + projection.scale() + ")"})
  .each(function(d) {
    d.cartoTranslate = "translate(" + projection([d.x,d.y]) + ")scale(" + projection.scale() + ")";
  });

  d3.selectAll("path.links")
  .transition()
  .duration(3000)
  .attr("d", path)

  zoomComplete();
  d3.select("#cartoOffButton").style("display", "none")
      if (psEffects == true) {
      drawBorders();
  }


}

function calculateRoute() {
  var newSettings = getSettings();

  d3.select(".calculateDisable").style("display", "block");
  routeQuery = "new_route.php?v="+newSettings.vehicle+"&m="+newSettings.month+"&s="+newSettings.source+"&t="+newSettings.target+"&tr="+newSettings.riverTransfer+"&ts="+newSettings.seaTransfer+"&p="+newSettings.priority+"&ml="+newSettings.modes+"&el="+newSettings.excluded;
  d3.selectAll("span.emptyHistory").remove();

  _gaq.push(['_trackEvent', 'query', "route", newSettings.source+"|"+newSettings.target]);
  
  d3.json(routeQuery, function(error,routeData) {
    d3.select(".calculateDisable").style("display", "none");
    exposedNewData = routeData;
    // Each segment needs to be tagged with the current route id so that later we can pull them out to measure them and show them
    for (x in routeData.features) {
      if (routeData.features[x]) {
	routeData.features[x].properties.routeID = currentRoute;
      }
    }
    routesRun[currentRoute] = newSettings;
    currentRoute++;
    for (x in routeData.features) {
      	var realSource = routeData.features[x].properties.source.toString().length == 6 ? routeData.features[x].properties.source.toString().substring(1,6) : routeData.features[x].properties.source;
	var realTarget = routeData.features[x].properties.target.toString().length == 6 ? routeData.features[x].properties.target.toString().substring(1,6) : routeData.features[x].properties.target;
	
      routeData.features[x].properties.source = siteHash[realSource];
      routeData.features[x].properties.target = siteHash[realTarget];
      routeData.features[x].geometry.source = siteHash[realSource];
      routeData.features[x].geometry.target = siteHash[realTarget];
      routeData.features[x].coordinates = routeData.features[x].geometry.coordinates;
      routeData.features[x].cartocoords = routeData.features[x].geometry.coordinates;
      routeSegments.push(routeData.features[x])
    }

  d3.select("#routesContainer").style("opacity", .2);
  
  d3.select("#resultsG").selectAll("path.results")
    .data(routeSegments, function(d) {return d.properties.routeID + "_" + d.properties.segment_id})
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "results links")
    .style("cursor", "pointer")
    .on("click", routeClick)
  .on("mouseover", resultsOver)
  .on("mouseout", resultsOut)
  .each(function(d) {d.properties.fixedColor = priorityColor[newSettings.priority]})

    zoomComplete();
    populateRouteDialogue(currentRoute - 1);
    
    for (x in exposedsites) {
      exposedsites[x].betweenness = 0;
    }
    for (x in exposedsites) {
      for (y in routeSegments) {
	var realTarget = routeSegments[y].properties.target.toString().length == 6 ? routeSegments[y].properties.target.toString().substring(1,6) : routeSegments[y].properties.target;
	if (exposedsites[x].id == routeSegments[y].properties.source.id || exposedsites[x].id == routeSegments[y].properties.target.id) {
	  exposedsites[x].betweenness++;
	}
      }
    }


    var maxBetweenness = d3.max(exposedsites, function (d) {return d.betweenness});
    betweennessScale.domain([0,1,maxBetweenness])

    addRouteRow(newSettings, routeData)
  })
}

function getSettings() {

  var sourceID = document.getElementById("sourceSelectButton").value;

  var targetID = document.getElementById("targetSelectButton").value;
  var priority = d3.select("#priorityForm > input:checked").node().value;

  var modeList = '';
  var modeArray = updateBGRoutes();
  var cartoDirection = 0;

  var monthID = d3.selectAll("#monthPicker > input").filter(function() {return d3.select(this).property("checked") ? this : null}).attr("value");
  var cartoDirection = d3.selectAll("#directionDiv > div > input").filter(function() {return d3.select(this).property("checked") ? this : null}).attr("value");

  var vehicleType = document.getElementById("vehicleSelectButton").value;
  var riverTransferCost = parseFloat(document.getElementById("riverTransferCost").value) / 2;
  var seaTransferCost = parseFloat(document.getElementById("seaTransferCost").value) / 2;
  isNaN(riverTransferCost) ? riverTransferCost = 0 : null;
  isNaN(seaTransferCost) ? seaTransferCost = 0 : null;
  

  modeArray.push("self","ferry","transferc","transferf","transfero","transferr");

  modeList = modeArray.join(",");
  
  var excludedIDs = "999," + excludedSites.toString();
 return {modes: modeList, modeArr: modeArray, source: sourceID, target: targetID, month: monthID, priority: priority, vehicle: vehicleType, seaTransfer: seaTransferCost, riverTransfer: riverTransferCost, excluded: excludedIDs, direction: cartoDirection}
  
}

function routeClick(d,i) {
  d3.select('#routesContainer').style('opacity', .2);
  d3.event.stopPropagation();
  var coords = d3.mouse(document.body);
/*  var modalContents = d3.select("#sitemodal").style("display", "block").style("left", (coords[0] + 20) + "px").style("top", (coords[1] - 20) + "px").html('')
  modalContents.append("p").html(d.properties.segment_type + " route from " + d.properties.source.label + " to " + d.properties.target.label)
  modalContents.append("p").html("Duration: " + d.properties.segmentduration);
  modalContents.append("p").html("Length: " + d.properties.segmentlength);
  modalContents.append("p").html("Expense (D): " + d.properties.segmentexpense_d);
  modalContents.append("p").html("Expense (W): " + d.properties.segmentexpense_w);
  modalContents.append("p").html("Expense (PC): " + d.properties.segmentexpense_c); */
  populateRouteDialogue(d.properties.routeID);
  d3.select(this).style("stroke", "red")

}

function idToLabel(inID) {
  //Trim the meta-nodes such that they have the IDs of their parent nodes
  //We can do this easily because metanodes are 1 character longer than normal nodes
  return siteHash[parseInt(inID.toString().length == 6 ? inID.toString().substring(1,6) : inID)].label;
  
}

function populateRouteDialogue(inRouteID) {
var inSource = routesRun[inRouteID].source;
var inTarget = routesRun[inRouteID].target;
  d3.selectAll(".sitecirc").classed("sourcecirc", false);
  d3.selectAll(".sitecirc").classed("targetcirc", false);
  d3.selectAll(".slabel").classed("underlined", false);
  siteLabel("site_g_"+inSource,true);
  siteLabel("site_g_"+inTarget,true);

  d3.select("#site_g_"+inTarget).select(".sitecirc").classed("targetcirc", "true");
  
  var tRoute = routesRun[inRouteID];
  inSource = idToLabel(inSource);
  inTarget = idToLabel(inTarget);

  d3.selectAll(".results")
  .style("stroke-width", function(d) {return (d.properties.routeID == inRouteID ? (3 / zoom.scale()) : (9 / zoom.scale())) + "px"})
  .style("stroke", function(d) {return d.properties.routeID == inRouteID ? "black" : "white"})

  d3.selectAll("path.resultsOutline").remove();

  var outlineData =   d3.selectAll(".results").filter(function(d) {return d.properties.routeID == inRouteID}).data();

    d3.select("#resultsG").selectAll("path.resultsOutline")
    .data(outlineData, function(d) {return d.properties.routeID + "_" + d.properties.segment_id})
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "resultsOutline links")
    .style("fill", "none")
    .style("stroke", "black")
    .on("mouseover", resultsOver)
    .on("mouseout", resultsOut);
  
  d3.selectAll(".results").filter(function(d) {return d.properties.routeID == inRouteID})
  .each(function() {this.parentNode.appendChild(this)})
  
  drawTimeline(d3.selectAll(".results").filter(function(d) {return d.properties.routeID == inRouteID}))

  var routeModalContents = d3.select("#routeResults").html('')
  var leftDiv = routeModalContents.append("div").attr("class", "rrLeft")
  var midDiv = routeModalContents.append("div").attr("class", "rrMid")
  var rightDiv = routeModalContents.append("div").attr("class", "rrRight")
  var segmentNumber = routeSegments.filter(function (el) {return el.properties.routeID == inRouteID}).length;
  var durationSum = d3.sum(routeSegments.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentduration})
  var lengthSum = d3.sum(routeSegments.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentlength})
  var expCSum = d3.sum(routeSegments.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentexpense_c})
  var expDSum = d3.sum(routeSegments.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentexpense_d})
  var expWSum = d3.sum(routeSegments.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentexpense_w})
  leftDiv.append("p").html("The " + priorityType[tRoute.priority] + " journey from <span class='boldRed'>" + inSource + "</span> to <span class='boldRed'>" + inTarget + "</span> in <span class='bold'>" + monthNames[tRoute.month] + "</span> takes <span class='bold'>" + d3.round(durationSum,1) + " days</span>, covering <span class='bold'>"+Math.floor(lengthSum) + " kilometers</span>.")
  midDiv.append("p").html("Prices in <span class='italic'>denarii</span>, based on the use of a faster sail ship and a civilian river boat (where applicable), and on these road options:")
  rightDiv.append("div").style("margin-top","p5x").html("Per kilogram of wheat (by donkey): <span class='bold'>" + d3.round(expDSum,2) + "</span>")
  rightDiv.append("div").html("Per kilogram of wheat (by wagon): <span class='bold'>" + d3.round(expWSum,2) + "</span>")
  rightDiv.append("div").html("Per passenger in a carriage: <span class='bold'>" + d3.round(expCSum,2) + "</span>")
  zoomComplete();
  if (cartogramRunning) {
    cartogramOn(lastCartoRan,siteHash[cartogramsRun[lastCartoRan].centerID].x,siteHash[cartogramsRun[lastCartoRan].centerID].y,true)
  }
}

function onOffSite(d, forceChange) {
  if (excludedSites.indexOf(d.id) > -1 && forceChange != "off") {
    d3.select("#sct" + d.id).style("opacity", 1)
    excludedSites = excludedSites.filter(function (el) {return el != d.id})
    d3.select("#incExcButton").html("Exclude Site")
  }
  else if (excludedSites.indexOf(d.id) == -1 && forceChange != "on") {
    d3.select("#sct" + d.id).style("opacity", 0)
    excludedSites.push("" +d.id+ "")
    d3.select("#incExcButton").html("Include Site")
  }
}

function clusterSitesUI() {  
  d3.select("#clustermodalBack").style("display", "block");
  var modalContents = d3.select("#clustercontent").html('');
  var leftDiv = modalContents.append("div").style("width", "400px").style("float", "left").style("padding-right", "40px")
  var rightDiv = modalContents.append("div").style("margin", "20px").style("background", "white").style("width", "300px").style("float", "left").style("padding", "10px")
  leftDiv.append("h2").html("Cluster").style("font-weight", "900")
  leftDiv.append("p").html("Clustering will color the sites to indicate which network center is closest according to the networks you have calculated. You can only cluster based on the same priority.")
  leftDiv.append("p").style("font-style", "italic").style("font-weight", "400").html("You must run 2 or more networks of the same priority for clustering to have any noticeable effect.")

  if(cartogramsRun.length == 0) {
    rightDiv.append("p").style("font-weight", 600).html("You have not run any cartograms. For clustering to be available, you need to run some cartograms by clicking on a site and clicking the Cartogram button.");
    return;
  }

  var leftControls = leftDiv.append("div").style("background", "white").attr("class", "buttonContainer")
  var newSelector = leftControls.append("fieldset").attr("id", "clusterPriorityForm").attr("class", "priorityForm").style("border", "none");
  newSelector.append("div").style("float", "left").style("margin", "5px 5px 0 0").style("color", "gray").style("font-size", "12px").style("padding-right", "5px").html("PRIORITY");
  newSelector.append("input").attr("id", "cfp").attr("onclick", "updateClusterUIList(0)").attr("type", "radio").attr("value", "0").attr("name", "cpriority").property("checked", true)
  newSelector.append("label").attr("for", "cfp").attr("class", "priority-picker-label").html("Fastest")
  newSelector.append("input").attr("id", "ccp").attr("onclick", "updateClusterUIList(1)").attr("type", "radio").attr("value", "1").attr("name", "cpriority")
  newSelector.append("label").attr("for", "ccp").attr("class", "priority-picker-label").html("Cheapest")
  newSelector.append("input").attr("id", "csp").attr("onclick", "updateClusterUIList(2)").attr("type", "radio").attr("value", "2").attr("name", "cpriority")
  newSelector.append("label").attr("for", "csp").attr("class", "priority-picker-label").html("Shortest")
  
  rightDiv.append("div").style("border-bottom", "1px gray solid").style("font-weight", "600px").html("Select all the calculated networks you wish to include in the cluster calculation.")
  var checkDiv = rightDiv.append("div").style("height", "70%").style("overflow", "auto");

  var availableCartos = checkDiv.append("ul");
  
  var aCLI = checkDiv.selectAll("li").data(cartogramsRun).enter().append("li")
  .attr("class", "availCartos")

  aCLI.append("input")
  .attr("id", function(d,i) {return "cOC" + i})
  .attr("type", "checkbox")
  .attr("class", "cartoOpt mode-checkbox")
  .attr("name", "cartooptions")
  .attr("value", function(d,i) {return i});

  aCLI.append("label")
  .attr("for", function(d,i) {return "cOC" + i})
  .attr("class", "mode-picker-label");
	  
  aCLI.append("span")
  .html(function(d) {return siteHash[d.centerID].label + " via " + d.vehicle + " in " + monthNames[d.month]})

  d3.selectAll(".availCartos")
  .style("display", function(p,q) {return 0 == p.priority ? "block" : "none"})
  
  var clusterControls = leftControls.append("div");
  clusterControls.append("div").style("float", "left").style("margin", "0px 10px 10px 10px").style("color", "gray").html("Frontier Tolerance");
  clusterControls.append("textarea").attr("id", "frontier").html("0.0");
  clusterControls.on("mouseover", function() {contextualHelp('frontier')}).on("mouseout", hideInfoPopup);

  leftDiv.append("button").attr("class", "calculatebutton").style("margin-top", "20px").on("click", clusterSites).html("Calculate Clusters")
  leftDiv.append("button").attr("class", "calculatebutton").style("margin-top", "20px").on("click", exportCartoCSV).html("Export to CSV")
  leftDiv.append("button").attr("class", "calculatebutton").style("margin-top", "20px").attr("id", "downloadButton").style("display", "none").html("Download as CSV")

  d3.selectAll(".cartoOpt")
  .property("checked", function(p,q) {return 0 == p.priority ? true : false})
}

function updateClusterUIList(selectorVal) {
  d3.selectAll(".availCartos")
  .style("display", function(p,q) {return selectorVal == p.priority ? "block" : "none"});
  d3.selectAll(".cartoOpt")
  .property("checked", function(p,q) {return selectorVal == p.priority ? true : false})

}
function hideInfoPopup() {
  d3.select('#infopopup').style('display','none');
}
function clusterSites() {
  _gaq.push(['_trackEvent', 'interaction', "cluster", "cluster"]);
  clusterRunning = true;
  activeCentersFull = activeCenter();
  activeCenters = d3.keys(activeCentersFull);
  var frontierSetting =  1 - parseFloat(document.getElementById("frontier").value);
  if (activeCenters.length == 0) {
    return;
  }
  for (x in exposedsites) {
    if (exposedsites[x]) {
      var maxVal = 1000;
      exposedsites[x].nearestCluster = "disabled";
      for (y in exposedsites[x]["cost"]) {
        if (activeCenters.indexOf(""+y) > -1 && parseInt(exposedsites[x]["cost"][y]) != -1) {
	  var diff = Math.abs(maxVal - parseFloat(exposedsites[x]["cost"][y]));
	  var larger = Math.max(maxVal, parseFloat(exposedsites[x]["cost"][y]));
	  var smaller = Math.min(maxVal, parseFloat(exposedsites[x]["cost"][y]));
	  if (frontierSetting < 1 && frontierSetting * larger < smaller) {
	    exposedsites[x]["nearestCluster"] = "frontier";
	  }
	  else if (parseFloat(exposedsites[x]["cost"][y]) < maxVal) {
            exposedsites[x]["nearestCluster"] = y;
            maxVal = parseFloat(exposedsites[x]["cost"][y]);
	  }
        }
      }
    }
  }
  
  var cartoKeys = d3.set(exposedsites.filter(function(el) {return el.nearestCluster != "frontier"}).map(function(el) {return el.nearestCluster})).values();

  cartoKeys.splice(0,0,"frontier");

  var clusterNumber = cartogramsRun.length;

  clusterOrdinal = d3.scale.category20().domain(cartoKeys);

  cartoLegend = d3.svg.legend().labelFormat("none").cellPadding(5).orientation("vertical").units("Cluster").cellWidth(25).cellHeight(18).inputScale(clusterOrdinal).cellStepping(10);

  clearBottom();
  d3.select("#legendTitle").html("CLUSTERS (click for details)")

  var routeModalContents = d3.select("#routeResults").html('')
  var leftDiv = routeModalContents.append("div").attr("class", "rrLeft").style("width","250px")
  var midDiv = routeModalContents.append("div").attr("class", "rrMid").style("width", "225px")
  var rightDiv = routeModalContents.append("div").attr("class", "rrRight").style("width", "65px")
  leftDiv.append("p").html("Sites have been colored based on their closest center" + (frontierSetting < 1 ? " or are dark blue if the site is within <span class='boldRed'>" + Math.ceil((1 - frontierSetting) * 100) + "%</span> of the cost to reach more than one center." : "."))
  midDiv.append("p").html("Number of sites in each cluster:").style("padding-bottom", "0")
  var rrList = midDiv.append("ul").style("margin-top", "0")
  rrList.selectAll("li").data(cartoKeys.filter(function(d) {return d != 999})).enter().append("li")
  .html(function (d) {return (d == 'frontier' || d == 'disabled' ? d : siteHash[cartogramsRun[d].centerID].label) + " (" + d3.selectAll("g.site").filter(function(p) {return p.nearestCluster == d}).size() + " sites)" })
  
  rightDiv.html('<button class="legendButton" onclick="createVoronoi();">Zones</button>')
  
    exposedsites.forEach(function (d) {
      d.fixedColor = clusterOrdinal(d["nearestCluster"]);
  })
    
  svg.selectAll(".sitecirctop")
  .style("fill", function(d) { return clusterOrdinal(d["nearestCluster"])});

  d3.select("#timelineSVG").append("g").attr("transform", "translate(60,30)").attr("class", "legend").call(cartoLegend);

  d3.select("g.legend").selectAll("g").selectAll("circle").remove();
  d3.select("g.legend").selectAll("g").selectAll("text.button").remove();
  d3.select("g.legend").selectAll("g.legendCells")
  .style("cursor", "pointer")
  .on("click", moreCartoInfo)
  .attr("transform", moveLCells);
  d3.select("g.legend").selectAll("g.legendCells")
  .select("text").text(function () {var a = d3.select(this).text(); return a == 'frontier' || a == 'disabled' ? a : siteHash[cartogramsRun[a].centerID].label.substring(0,15)})
    
  function moveLCells(d,i) {
    var newY = i%4 * 20;
    var newX = Math.floor(i/4) * 200;
    return "translate(" + newX + "," + newY + ")";
  }

  d3.select("#hullButton").style("display","block");
  d3.selectAll(".slabel").classed("underlined", false);
  zoomComplete();

  for (x in activeCentersFull) {
    siteLabel("site_g_"+activeCentersFull[x].centerID,true);
  }
  d3.select('#clustermodalBack').style('display','none');
}

    function moreCartoInfo(d) {
    var wC = d.stop[0];
    var cartoContent = 'There are no additional settings associated with frontier or disabled sites.'
    d3.select("#infopopup").style("display", "block");
    if (wC == 'frontier' || wC == 'disabled') {
    }
    else {
      cartoContent = formatClusterSettings(cartogramsRun[wC]);
    }
      d3.select("#infocontent").html(cartoContent)
  }

function formatClusterSettings(incSettings) {
  var displayValue = "";

  var cartoContent = '<h3 class="contextHelpHead">'+siteHash[incSettings.centerID].label + ' Cluster</h3>'
	displayValue = directionHash[incSettings.direction];
	cartoContent += "<p>Direction: " + displayValue + "</p>"
	displayValue = priorityType[incSettings.priority];
	cartoContent += "<p>Priority: " + displayValue + "</p>"
	displayValue = monthNames[incSettings.month];
	cartoContent += "<p>Month: " + displayValue + "</p>"
	cartoContent += "<p>Mode (land): " + incSettings.vehicle + "</p>"
	displayValue = incSettings["modes"].split(',').filter(function(d) {return ['ferry','upstream','fastup','transferc','transferr','transferf','transfero','self'].indexOf(d) == -1}).map(function(d) {return modeHash[d]}).join(",");
	cartoContent += "<p>Network: " + displayValue + "</p>"
	if (incSettings["excluded"] != "999,99999") {
	  displayValue = incSettings["excluded"].split(",").map(function(d) {return siteHash[d] ? siteHash[d].label : ""});
	  cartoContent += "<p>Excluded Sites: " + displayValue + "</p>"
	}

	cartoContent += "<p>River Transfer Cost: " + incSettings.riverTransfer + "</p>"
	cartoContent += "<p>Sea Transfer Cost: " + incSettings.seaTransfer + "</p>"
	return cartoContent;
}

function provincesOnOff() {
  if (d3.select("#hullsG").selectAll("g").empty()) {
    d3.select("#borderOnButton > input").property("checked", true);
    drawBorders();
    psEffects = true;

  }
  else {
    d3.select("#borderOnButton > input").property("checked", false);
    d3.select("#hullsG").selectAll("g").remove();
    d3.select("#borderOnButton").select("svg").select("path").style("fill", "gray");
    psEffects = false;
  }
}

function drawBorders(constraint) {
  d3.select("#borderOnButton").select("svg").select("path").style("fill", "black");
  var terrType = "province"
  groupPath = function(d) {
    return "M" + d3.geom.hull(d.values.map(function(i) {
	return d3.transform(i.cartoTranslate).translate;
    })).join("L") + "Z";
};
    groups = [];
//    for (centerX in matchedCartos) {
/*	groups.push({
	    key: 1,
	    name: "England",
	    vArray: ["50032", "50090", "50098", "50101", "50133", "50147", "50156", "50160", "50186", "50207", "50232", "50249", "50303", "50330", "50412", "50411", "50415", "50421", "50235", "50240"],
	    values: [],
	    color: "black",
	    id: "O"
	})
	groups.push({
	    key: 2,
	    name: "Italy",
	    vArray: 	["50004", "50007", "50009", "50010", "50020", "50022", "50034", "50043", "50047", "50049", "50502", "50052", "50066", "50078", "50081", "50086", "50504", "50102", "50109", "50110", "50122", "50127", "50134", "50136", "50144", "50168", "50171", "50172", "50173", "50174", "50175", "50183", "50521", "50193", "50530", "50489", "50205", "50209", "50527", "50524", "50226", "50523", "50237", "50255", "50256", "50265", "50268", "50278", "50279", "50286", "50294", "50307", "50308", "50309", "50312", "50761", "50322", "50323", "50324", "50326", "50520", "50335", "50529", "50348", "50357", "50358", "50366", "50377", "50378", "50381", "50393", "50395", "50509", "50402", "50413", "50425", "50104", "50069", "50417", "50410", "50113", "50015", "50132", "50241", "50042", "50292", "50251", "50414", "50261", "50055", "50327"],
	    values: [],
	    color: "white",
	    id: "O"
	})
	for (y in groups) {
	for (x in groups[y].vArray) {
		    groups[y]["values"].push(siteHash[groups[y].vArray[x]])
	    }
	}
	*/
  var territories = constraint || d3.set(d3.selectAll("g.site").data().map(function(d) {return d[terrType]})).values();  
  var terrScale = d3.scale.linear().domain([0,territories.length]).range(["white", "black"])
  for (x in territories) {
    var arrValues = d3.selectAll("g.site").data().filter(function(d) {return d[terrType] == territories[x]});
    var newObj = {key: x, name: territories[x], values: arrValues, color: "gray", id: x};
    groups.push(newObj)
  }
	/*
	if ((groups[(groups.length - 1)]["values"].length < 3) || (groups[(groups.length - 1)]["values"].length >= exposedsites.length)) {
	    groups.pop();
	} */
//    }

  if (d3.select("#hullsG").selectAll("g").empty()) {

    var hullG = d3.select("#hullsG").style("pointer-events", "none").selectAll("g.hull").data(groups).enter().append("g").attr("class","hull");
    
    hullG.append("path").attr("id",function(d) {return "hull" + d.key}).attr("class", "hull")
    .style("fill", function(d,i) {
	return terrScale(i)
    }).style("stroke", function(d,i) {
	return "black"
    })
    .style("stroke-width", scaled(4))
    .style("stroke-linejoin", "round")
    .style("fill-opacity", .40)
    .style("pointer-events", "none")
    .attr("d", groupPath)
      }
else {
  d3.selectAll("path.hull").transition().duration(3000).attr("d", groupPath)
}
}

function closeTimelineTray() {
  var toLeft = document.body.clientWidth - 40 || document.body.parentNode.clientWidth - 40;
  if (parseInt(d3.select("#timelineViz").style("left")) < -100) {
    toLeft = 0;
  }
  d3.select("#timelineViz").transition().duration(500).style("left", (-toLeft) + "px")
}

function fullscreenMap() {
  d3.selectAll(".controlsDiv").style("display", "none")
  d3.select("#restoreButton").style("display", "block")
}

function restoreControlsMap() {
  d3.selectAll(".controlsDiv").style("display", "block")
  d3.select("#restoreButton").style("display", "none")
}

function tutorial(step) {
  d3.select("#tutorialpopup").style("display", "block");
  var leftVal = "", rightVal = "", topVal = "", arrowVal = "", nextStep = "";
  switch(step) {
    case 1:
      switchControls('route');
      topVal = "165px";
      leftVal = "50px";
      rightVal = "";
      arrowVal = "20px";
      nextStep = "Selecting a Month"
      newContent = "<p>To calculate a route, select a starting point and destination for your route.</p>"
    break;
    case 2:
      topVal = "265px";
      leftVal = "40px";
      rightVal = "";
      arrowVal = "20px";
      nextStep = "Setting a Priority"
      newContent = "<p>Route cost and availability can change depending on time of year. Sea routes adjust or are unavailable due to changing wind patterns and high altitude roads can be inaccessible during the winter.</p>"
    break;
    case 3:
      topVal = "445px";
      leftVal = "30px";
      rightVal = "";
      arrowVal = "20px";
      nextStep = "Selecting Modes";
      newContent = "<p>There are three possible priorities to determine the least cost path. <ul><li>'Fastest' bases the calculation on the amount of time travel takes.</li><li>'Cheapest' routes are calculated based on the cost of shipping grain or a passenger.</li><li>'Shortest' routes are determined solely on the length of the routes.</li></ul></p>";
    break;
    case 4:
      topVal = "115px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "-1000px";
      nextStep = "Changing Maritime Options"
      newContent = "<p>You can activate and deactivate different modes of travel by clicking these buttons to customize your route further. Some sites are inaccessible with certain modes turned off, such as islands if sea routes are turned off.</p>"
    break;
    case 5:
      topVal = "115px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "-1000px";
      nextStep = "Selecting Vehicle Type"
      newContent = "<p>Rivers and sea routes are modeled in ORBIS using two different sets of assumptions for each type. For rivers, there is a 'Civilian' and 'Military' option, and the latter affords greater speed by simulating rowing. For sea routes, there are two different modeled ships, a faster and a slower one, that have different speeds and slightly different paths.</p>"
    break;
    case 6:
      topVal = "115px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "-1000px";
      nextStep = "Transfer Cost"
      newContent = "<p>Your method of travel is going to affect speed (based entirely on the listed rate of km/day) and price to ship grain (by cart or by donkey/porter) or the price to transport a passenger (by carriage).</p><p>You can see dramatic differences in paths, cost, and travel time by varying the method of travel.</p>"
    break;
    case 7:
      topVal = "115px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "-1000px";
      nextStep = "High Resolution Roads"
      newContent = "<p>Transfer cost is the number of days (for fastest priority) or denarii (for cheapest priority) it takes to switch from one mode to another. A cost of 0.5 adds half a day or denarius to any change from road to river or sea route to road and so on. This friction can also dramatically change routes if it is high enough.</p>"
    break;
    case 8:
      topVal = "115";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "-1000px";
      nextStep = "Calculate Route"
      newContent = "<p>We offer a comprehensive road network for Roman Britain. By turning on this option, you can calculate trips in that province in greater detail.</p>"
    break;
    case 9:
      topVal = "235px;";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "-1000px";
      nextStep = "Site Options"
      newContent = "<p>Click 'Calculate Route' to see your route on the map.</p>"
    break;
    case 10:
      topVal = "100px";
      leftVal = "40%";
      rightVal = "";
      arrowVal = "-1000px";
      nextStep = "Exclude/Include Site"
      newContent = "<p>Clicking on any site (the red circles on the map) will provide you with options for labeling sites or seeing more details about it. You can also make that site the starting point or destination of a route, or run a network or flow calculation with that site as the center.</p>"
    break;
    case 11:
      topVal = "100px";
      leftVal = "40%";
      rightVal = "";
      arrowVal = "-1000px";
      nextStep = "Calculate Network"
      newContent = "<p>Clicking 'Exclude' will cause this site and any connections to be ignored when calculating routes and cartograms. Clicking 'Include' will restore the site's availability to the model. You can include and exclude sites individually like this or use the 'Select Sites' button to do this with multiple sites on the map.</p>"
    break;
    case 12:
      switchControls('cartogram');
      topVal = "100px";
      leftVal = "40%";
      rightVal = "";
      arrowVal = "-1000px";
      nextStep = "Calculate Flow"
      newContent = "<p>Calculating a network allows you to determine the connectivity cost between this site and all other sites. The displayed distance is based on the expense or time taken to travel from that point to any other point modeled in ORBIS. If you click on sites after running a network, you will see the cost (in time, money, or distance) of each site based on the networks you have run. You can distort geography using a dynamic distance cartogram to visualize that distance by clicking 'Cartogram' and restore the traditional geographic representation with the 'Georectify' button. The 'Zones' button will give you a territorial representation.</p><p>After running two or more network calculations, you can click the 'Cluster' button to see which sites are closer to each network center.</p>"
    break;
    case 13:
      switchControls('Minard');
      topVal = "165px";
      leftVal = "40%";
      rightVal = "";
      arrowVal = "-1000px";
      nextStep = "History"
      newContent = "<p>Like the network calculation, a flow calculation shows you aggregated results of running paths for all sites to or from a single center. These paths are then totaled by network segment to give some indication of the main arteries of transportation according to the center, time of year, priority and mode settings.</p>"
    break;
    case 14:
      topVal = "345px";
      leftVal = "";
      rightVal = "10px";
      arrowVal = "255px";
      nextStep = "End the Tutorial"
      newContent = "<p>Clicking the 'History' button will show you a table of the networks, flows and routes that you have calculated.</p>"
    break;
    case 15:
      d3.select("#tutorialpopup").style("display", "none");
      return;
    break;
    
    
  }
  
  newContent += "<p>Close this tutorial by clicking X or go on to <a href='#' onclick='tutorial("+(step+1)+")'>"+nextStep+"</a></p>";  
  d3.select("#tutorialpopup").style("top", topVal).style("left", leftVal).style("right", rightVal)
  d3.select("#tutorialarrow").style("left", arrowVal)
  d3.select("#tutorialcontent").html(newContent)

}

tut = function() {
  this.randomSourceTarget = function randomSourceTarget() {
  }
}

function addCartoRow(cartoSettings) {
  
  var newCartoRow = d3.select("#recentList").append("div")
  .style("background", "white")
  .style("border", "1px lightgray solid")
  .style("width", "500px")
  .style("height", "180px")
  .style("margin-bottom", "10px")
  .style("padding", "10px")
  .attr("class", "networkRow resultsRow networkDiv" + (cartogramsRun.length - 1))


  var newCartoGrid = d3.select("#recentGrid").append("div")
  .style("background", "white")
  .style("border", "1px lightgray solid")
  .style("width", "140px")
  .style("height", "140px")
  .style("margin", "10px")
  .style("padding", "5px")
  .style("float", "left")
  .style("position", "relative")
  .attr("class", "networkRow resultsRow networkDiv" + (cartogramsRun.length - 1))

  canvas = newCartoRow.append("canvas")
  .style("background", "white").style("border", "black 1px solid").attr("height", 700).attr("width", 1000)
  .attr("id", "newCanvas");
  
  context = canvas.node().getContext("2d");
  
  context.beginPath();
  context.rect(0, 0, 1000, 700);
  context.fillStyle = 'white';
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = 'black';
  context.stroke();
  
  var projection2 = d3.geo.mercator()
    .scale(900)
    .translate([700, 1100])
    .rotate([-26,2,0]);
    
    var path2 = d3.geo.path()
    .projection(projection2);
  
  var land = topojson.feature(exposedroutes, exposedroutes.objects.base_routes)
  var coast = topojson.feature(exposedCoast, exposedCoast.objects.coast)
  context = canvas.node().getContext("2d");

  context.beginPath();
  context.rect(0, 0, 1000, 700);
  context.fillStyle = 'white';
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = 'black';
  context.stroke();

  context.strokeStyle = "rgba(0, 0, 0, 0.1)";
  context.beginPath(), path2.context(context)(land), context.fill(), context.stroke();

  context.strokeStyle = 'black';
  context.lineWidth = 1;
  context.beginPath(), path2.context(context)(coast), context.stroke();
  
  var t = cartogramsRun.length - 1;
  var max = d3.max(exposedsites, function(p) {return parseFloat(p["cost"][t])});
  var mid = max / 2;

//  var colorramp=d3.scale.linear().domain([-1,0,0.01,mid,max]).range(["lightgray","cyan","#7e8fc3","#c28711","#ad5041"]);


  var oSc = orbisColorScale;
  switch (parseInt(cartogramsRun[t].priority)) {
    case 0:
      oSc = fastestScale;
      break;
    case 1:
      oSc = cheapestScale;
      break;
    case 2:
      oSc = shortestScale;
  }
  var colorramp = d3.scale.quantize().domain([0,max]).range(oSc);
  var costramp=d3.scale.linear().domain([0,max]).range([0,1]);

    d3.selectAll("g.site").each(function(d,i) {
    var coords = projection2([d.x,d.y])

    context.fillStyle = colorramp(d.cost[t]);
    context.beginPath();
    context.arc(coords[0],coords[1],5,0,2*Math.PI);
    context.strokeStyle = "black";
    context.lineWidth = 1;
    context.stroke();
    context.fill();

    if (d3.select(this).select("text").empty() == false) {
    context.font = "11pt Helvetica";
    context.textAlign = 'center';
    context.strokeStyle = "rgba(255, 255, 255, 0.5)";
    context.lineWidth = 3;
    context.strokeText(d.label, coords[0], coords[1] - 8)
    context.fillStyle = 'black';
    context.fillText(d.label, coords[0], coords[1] - 8)
    }
    
  })
  
  var imgUrl = document.getElementById("newCanvas").toDataURL("image/png");
  var detailsDiv = newCartoRow.append("div").style("float", "left").style("width", "170px");
  detailsDiv.append("img").attr("src", imgUrl).style("width", "170px").style("height", "120px");

  var gridDiv = newCartoGrid.append("div").style("width", "170px");
  gridDiv.append("img").attr("src", imgUrl).style("width", "140px").style("height", "100px")
  .style("cursor", "pointer")
  .attr("onclick", function() {return "cartogramOn("+ (cartogramsRun.length - 1) +"," + siteHash[cartoSettings.centerID].x + "," + siteHash[cartoSettings.centerID].y + ");runCarto(" + siteHash[cartoSettings.centerID].x + "," + siteHash[cartoSettings.centerID].y + "," + cartoSettings.centerID + "," + (cartogramsRun.length - 1) + ");"})
  newCartoGrid.append("span").style("position", "absolute").style("bottom", "10px")
  .html(siteHash[cartoSettings.centerID].label)
  
  canvas.remove();

  formatSettings(cartoSettings, newCartoRow, imgUrl, siteHash[cartoSettings.centerID].label + " Network", "network");

}

function addRouteRow(routeSettings, newRoute) {
  
  var newRow = d3.select("#recentList").append("div")
  .style("background", "white")
  .style("border", "1px lightgray solid")
  .style("width", "500px")
  .style("height", "180px")
  .style("margin-bottom", "10px")
  .style("padding", "10px")
  .attr("class", "routeRow resultsRow routeDiv" + (currentRoute - 1))

  var newGrid = d3.select("#recentGrid").append("div")
  .style("background", "white")
  .style("border", "1px lightgray solid")
  .style("width", "140px")
  .style("height", "140px")
  .style("margin", "10px")
  .style("padding", "5px")
  .style("float", "left")
  .style("position", "relative")
  .attr("class", "routeRow resultsRow routeDiv" + (currentRoute - 1))
  
  canvas = newRow.append("canvas")
  .style("background", "white").style("border", "black 1px solid").attr("height", 700).attr("width", 1000)
  .attr("id", "newCanvas");
    
  var diameter = 500,
    radius = diameter/2;
 
var projection2 = d3.geo.mercator()
    .scale(900)
    .translate([700, 1100])
    .rotate([-26,2,0]);
    
    var path2 = d3.geo.path()
    .projection(projection2);
  
  var land = topojson.feature(exposedroutes, exposedroutes.objects.base_routes)
  var coast = topojson.feature(exposedCoast, exposedCoast.objects.coast)
  context = canvas.node().getContext("2d");

  context.beginPath();
  context.rect(0, 0, 1000, 700);
  context.fillStyle = 'white';
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = 'black';
  context.stroke();

  context.strokeStyle = "rgba(0, 0, 0, 0.1)";
  context.beginPath(), path2.context(context)(land), context.fill(), context.stroke();

  context.strokeStyle = 'black';
  context.lineWidth = 1;
  context.beginPath(), path2.context(context)(coast), context.stroke();
  
  var drawRoutes = exposedroutes.objects.base_routes.geometries;
  
  context.strokeStyle = 'darkred';
  context.lineWidth = 4;
  context.fillStyle = 'none';
  context.beginPath(), path2.context(context)(newRoute), context.fill(), context.stroke();
  
  d3.selectAll("g.site").filter(function(el) {return d3.select(this).select("text").empty() == false}).select("text")
  .each(function(d,i) {
    var coords = projection2([d.x,d.y])
  context.font = "11pt Helvetica";
  context.textAlign = 'center';
  context.strokeStyle = "rgba(255, 255, 255, 0.5)";
  context.lineWidth = 3;
  context.strokeText(d.label, coords[0], coords[1] - 8)
  context.fillStyle = 'black';
    context.fillText(d.label, coords[0], coords[1] - 8)

  context.beginPath();
  context.arc(coords[0], coords[1],5,0,2*Math.PI);
  context.fill();
    })
  
  var imgUrl = document.getElementById("newCanvas").toDataURL("image/png");
  var detailsDiv = newRow.append("div").style("float", "left").style("width", "170px");
  detailsDiv.append("img").attr("src", imgUrl).style("width", "170px").style("height", "120px");

  var gridDiv = newGrid.append("div").style("width", "140px");
  gridDiv.append("img").attr("src", imgUrl).style("width", "140px").style("height", "100px")
  .style("cursor", "pointer")
  .attr("onclick", function() { return "populateRouteDialogue(" + (currentRoute - 1) + ");" })
  ;
  
  newGrid.append("span").style("position", "absolute").style("bottom", "10px")
  .html(siteHash[routeSettings.source].label + " -> " + siteHash[routeSettings.target].label)
    
  canvas.remove();
  
  formatSettings(routeSettings, newRow, imgUrl,siteHash[routeSettings.source].label + " to " + siteHash[routeSettings.target].label, "route");

}

function addFlowRow(flowSettings) {
  
  var newRow = d3.select("#recentList").append("div")
  .style("background", "white")
  .style("border", "1px lightgray solid")
  .style("width", "500px")
  .style("height", "180px")
  .style("margin-bottom", "10px")
  .style("padding", "10px")
  .attr("class", "flowRow resultsRow flowDiv" + (flowsRun.length - 1))


  var newGrid = d3.select("#recentGrid").append("div")
  .style("background", "white")
  .style("border", "1px lightgray solid")
  .style("width", "140px")
  .style("height", "140px")
  .style("margin", "10px")
  .style("padding", "5px")
  .style("float", "left")
  .style("position", "relative")
  .attr("class", "flowRow resultsRow flowDiv" + (flowsRun.length - 1))
  
  canvas = newRow.append("canvas")
  .style("background", "white").style("border", "black 1px solid").attr("height", 700).attr("width", 1000)
  .attr("id", "newCanvas");
    
  var diameter = 500,
    radius = diameter/2;

var projection2 = d3.geo.mercator()
    .scale(900)
    .translate([700, 1100])
    .rotate([-26,2,0]);
    
    var path2 = d3.geo.path()
    .projection(projection2);
  
  var land = topojson.feature(exposedroutes, exposedroutes.objects.base_routes)
  var coast = topojson.feature(exposedCoast, exposedCoast.objects.coast)
  context = canvas.node().getContext("2d");

  context.beginPath();
  context.rect(0, 0, 1000, 700);
  context.fillStyle = 'white';
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = 'black';
  context.stroke();

  context.strokeStyle = "rgba(0, 0, 0, 1)";
  for (x in exposedroutes.objects.base_routes.geometries) {
  var flowSeg = topojson.feature(exposedroutes, exposedroutes.objects.base_routes.geometries[x])

  if (flowSeg.properties.fixedWidth > 1) { 
    context.lineWidth = flowSeg.properties.fixedWidth;
    context.beginPath(), path2.context(context)(flowSeg), context.stroke();
  }
  }

  context.strokeStyle = 'black';
  context.lineWidth = 1;
  context.beginPath(), path2.context(context)(coast), context.stroke();
  
  var drawRoutes = exposedroutes.objects.base_routes.geometries;
    
  d3.selectAll("g.site").filter(function(el) {return d3.select(this).select("text").empty() == false}).select("text")
  .each(function(d,i) {
    var coords = projection2([d.x,d.y])
  context.font = "11pt Helvetica";
  context.textAlign = 'center';
  context.strokeStyle = "rgba(255, 255, 255, 0.5)";
  context.lineWidth = 3;
  context.strokeText(d.label, coords[0], coords[1] - 8)
  context.fillStyle = 'black';
    context.fillText(d.label, coords[0], coords[1] - 8)
    })
  
  var imgUrl = document.getElementById("newCanvas").toDataURL("image/png");
  var detailsDiv = newRow.append("div").style("float", "left").style("width", "170px");
  detailsDiv.append("img").attr("src", imgUrl).style("width", "170px").style("height", "120px");

  var gridDiv = newGrid.append("div").style("width", "140px");
  gridDiv.append("img").attr("src", imgUrl).style("width", "140px").style("height", "100px")
  .style("cursor", "pointer")
  ;
  
  newGrid.append("span").style("position", "absolute").style("bottom", "10px")
  .html(siteHash[flowSettings.centerID].label + " Flow")
//  .html(siteHash[routeSettings.source].label + " -> " + siteHash[routeSettings.target].label)
    
  canvas.remove();
  formatSettings(flowSettings, newRow, imgUrl, siteHash[flowSettings.centerID].label + " Flow", "flow");

}

function formatSettings(incSettings, targetSelection, imgUrl, rowLabel, rowType) {
  exposedSettings = incSettings;
  
  var da = new Date();
  var dateStamp = da.getMonth + " - " + da.getDate() + " - " + da.getFullYear();

  var annotationDiv = targetSelection.append("div").style("overflow", "hidden").style("padding-left", "10px").style("width", "300px").style("float", "left");

  annotationDiv.append("h3").style("margin-top", 0)
  .html(rowLabel)


  annotationDiv.append("p").html("Priority: " + incSettings.priority
    + ", Month: " + incSettings.month + ", vehicle: " + incSettings.vehicle + ", River Transfer Cost: " +incSettings.riverTransfer + ", Sea Transfer Cost: " +incSettings.seaTransfer + " modes: ");
  annotationDiv.append("button").attr("class", "legendButton").style("margin-right","10px").style("width","110px").html("Open in a new tab")
  .on ("click", function () {
  var newPage1 = "<html><head><title>" + rowLabel + "</title></head><style>div: {width:100%;}</style><body><div><h1>" + rowLabel + "</div><div><img src='";
  var newPage2 = "' /></div><div><p>Scheidel, W. and Meeks, E. (May 2, 2012). ORBIS: The Stanford Geospatial Network Model of the Roman World. Retrieved " + da.toDateString() + ", from http://orbis.stanford.edu.</div></body></html>";  
  var opened = window.open("", "_blank");
  window.focus();
  opened.document.write(newPage1 + imgUrl + newPage2);    
  }
       )
  var divRemove = '';
  if (rowType == "network") {
    divRemove = "networkDiv"+ (cartogramsRun.length - 1);
      annotationDiv.append("button").attr("class", "legendButton").style("margin-right","10px").html("Redisplay")
      .attr("onclick", function() {return "d3.select('#resultsTableBack').style('display','none');runCarto(" + siteHash[incSettings.centerID].x + "," + siteHash[incSettings.centerID].y + "," + incSettings.centerID + "," + (cartogramsRun.length - 1) + ");"})
      annotationDiv.append("button").attr("class", "delete legendButton").style("margin-right","10px").html("Delete")
      .attr("onclick", function() {return "cartogramsRun["+ (cartogramsRun.length - 1)+"].priority=9;cartogramsRun["+ (cartogramsRun.length - 1)+"].centerID=999;d3.select(this.parentNode).remove();d3.selectAll('."+ divRemove +"').remove();"})
  }
  else if (rowType == "route"){
    divRemove = "routeDiv"+ (currentRoute - 1);
    annotationDiv.append("button").attr("class", "legendButton").style("margin-right","10px").html("Redisplay")
    .attr("onclick", function() { return "populateRouteDialogue("+ (currentRoute - 1) + ");" })
    annotationDiv.append("button").attr("class", "delete legendButton").style("margin-right","10px").html("Delete")
    .attr("onclick", function() {return "d3.selectAll('.resultsOutline').remove();routesRun["+ (currentRoute - 1)+"].source=999;d3.selectAll('.results').filter(function(d) {return d.properties.routeID == "+ (currentRoute - 1)+"}).remove();routeSegments = routeSegments.filter(function(d) {return d.properties.routeID != " + (currentRoute - 1)+ "});d3.select(this.parentNode).remove();d3.selectAll('."+ divRemove +"').remove();"})
  }

  else {
    divRemove = "flowDiv"+ (flowsRun.length - 1);
      annotationDiv.append("button").attr("class", "delete legendButton").style("margin-right","10px").html("Delete")
      .attr("onclick", function() {return "d3.select(this.parentNode).remove();d3.selectAll('."+ divRemove +"').remove();"})    
  }
  


  
  var newRow = d3.select("#recTableActual").append("tr").attr("class", rowType + "Row resultsRow "+divRemove);

  newRow.append("td").html()
  newRow.append("td").html(incSettings.centerID ? siteHash[incSettings.centerID].label : siteHash[incSettings.source].label)
  newRow.append("td").html(incSettings.centerID ? rowType : siteHash[incSettings.target].label)
  newRow.append("td").html(incSettings.priority)
  newRow.append("td").html(incSettings.month)
  newRow.append("td").html(incSettings.vehicle)
  var imgButton = newRow.append("td").append("div")
  .style("width", "90px")
  .style("height", "40px")
  .style("overflow", "hidden")
  .append("img").attr("src", imgUrl)
  .style("cursor", "pointer")
  .style("position", "relative")
  .style("left", "-20px")
  .style("top", incSettings.centerID ? "-20px" : "-10px")
  .style("width", "120px")
  .style("height", incSettings.centerID ? "120px" : "80px")
  
  if (incSettings.centerID) {
      imgButton
      .attr("onclick", function() {return "runCarto(" + siteHash[incSettings.centerID].x + "," + siteHash[incSettings.centerID].y + "," + incSettings.centerID + "," + (cartogramsRun.length - 1) + ");"})
  }
    else {
      imgButton
      .attr("onclick", function() { return "populateRouteDialogue(" + (currentRoute - 1) + ");" })
  }
  
//  var figureDiv = targetSelection.append("div").style("width", "500px").style("overflow", "hidden")
//  figureDiv.append("p").html(JSON.stringify(incSettings))

}

function scaled(incomingNumber) {
  return incomingNumber / zoom.scale();
}

function updateBGRoutes() {
  activeBGTypes = [];
  d3.select("#modeForm").selectAll("input:checked").each(function () {
    activeBGTypes = activeBGTypes.concat(this.value.split(","));
  })
  activeBGTypes.push("ferry");
  zoomComplete();
  return activeBGTypes;
}

function brushed() {
    if (voronoiRunning == true) {
    clearVoronoi();
  }

  d3.select("#siteSelectionModalContent").html("<p>You can draw a box to select multiple sites and remove them from or add them to the network.</p><p>Red sites are included in the network, white sites are excluded.</p>");
  d3.selectAll(".multiSiteControl").style("display", "inline")
  
  var currentExtent = brush.extent();
  var filteredSelection = d3.selectAll("g.site").filter(function(el) {
    var displayed = d3.select(this).style("display");
    var thisX = (d3.transform(d3.select(this).attr("transform")).translate[0] * zoom.scale()) + zoom.translate()[0];
    var thisY = (d3.transform(d3.select(this).attr("transform")).translate[1] * zoom.scale()) + zoom.translate()[1];
    return displayed != "none" && thisX >= currentExtent[0][0] && thisX <= currentExtent[1][0] && thisY >= currentExtent[0][1] && thisY <= currentExtent[1][1] ? this : null;
  })
  
  d3.selectAll("g.site").select(".sitecirctop").style("fill", "red")
  
  filteredSelection.select(".sitecirctop").style("fill", "red")
  
  d3.selectAll("g.changeButton")
  .attr("transform", function(d,i) {return "translate("+currentExtent[1][0]+","+(currentExtent[0][1] + (i *50)) +")"} )

  if (filteredSelection.empty()) {
    d3.selectAll(".multiSiteControl").style("display", "none")    
  }
  else {
    d3.select("#siteSelectionModalContent").append("p").html("" + filteredSelection.size() + " sites selected")
  }
}

function massSiteChange(onOff) {
  var currentExtent = brush.extent();
  var filteredSelection = d3.selectAll("g.site").filter(function(el) {
    var displayed = d3.select(this).style("display");
    var thisX = (d3.transform(d3.select(this).attr("transform")).translate[0] * zoom.scale()) + zoom.translate()[0];
    var thisY = (d3.transform(d3.select(this).attr("transform")).translate[1] * zoom.scale()) + zoom.translate()[1];
    return displayed != "none" && thisX >= currentExtent[0][0] && thisX <= currentExtent[1][0] && thisY >= currentExtent[0][1] && thisY <= currentExtent[1][1] ? this : null;
  })
  if (onOff == "exclude") {
    d3.selectAll("g.site").each(function(d) {onOffSite(d, "on")});
    filteredSelection.each(function(d) {onOffSite(d, "off")});
  }
  else if (onOff == "intersect") {
    d3.selectAll("g.site").each(function(d) {onOffSite(d, "off")});
    filteredSelection.each(function(d) {onOffSite(d, "on")});    
  }
  else if (onOff == "all") {
    d3.selectAll("g.site").each(function(d) {onOffSite(d, "on")});
  }
  else if (onOff == "none") {
    d3.selectAll("g.site").each(function(d) {onOffSite(d, "off")});
  }
  else {
    filteredSelection.each(function(d) {onOffSite(d, onOff)});
  }
}

function startBrushing() {
  _gaq.push(['_trackEvent', 'ui', 'selectSites', 'selectSites']);
  if (dotStyle) {
    changeStyleDots();
  }
  d3.selectAll("g.site").attr("display", "block");
  d3.select("#siteSelectionModal").style("display", "block");
  d3.select("#siteSelectionModalContent").html("<p>Use your cursor to draw a box to select multiple sites. Then use the buttons to limit your analysis to these sites or to remove them from or add them to the network.</p>");
  d3.select("#startBrushingButton").style("display", "none");
  d3.select("#stopBrushingButton").style("display", "inline");
  d3.select("g.zoom").style("display", "none");
  d3.select("g.brush").style("display", "block");
  
}

function stopBrushing() {
  d3.select("#startBrushingButton").style("display", "inline");
  d3.select("#stopBrushingButton").style("display", "none");
  d3.select("g.zoom").style("display", "block");
  d3.select("g.brush").style("display", "none");
  d3.select("#siteSelectionModal").style("display", "none");
  zoomInitialize();
  zoomComplete();

}

function createVoronoi() {
      _gaq.push(['_trackEvent', 'interaction', "voronoi", "voronoi"]);

    if (voronoiRunning == true) { 
      clearVoronoi();
      return;
    }
    networkOff(true);
  zoomComplete();
  colorArray = [];
  clippingPolys = [];
  var cPS = zoom.scale() / 80;

  forVoronoi = [];
    
  d3.selectAll(".sitecirctop")
  .filter(function() {return !cartogramRunning || d3.select(this).style("fill") != "#d3d3d3"})
  .each(function(el) {
    forVoronoi.push(
		    {
		    x: d3.transform(el.cartoTranslate).translate[0],
		    y: d3.transform(el.cartoTranslate).translate[1],
		    color: d3.select(this).style("fill")
		    });
    })
  
  clearVoronoi();
  voronoiRunning = true;
  
  vorXExtent = d3.extent(forVoronoi, function(d) {return d.x})
  vorYExtent = d3.extent(forVoronoi, function(d) {return d.y})

  //create constraint points
  if (!cartogramRunning) {
    var vxScale = d3.scale.linear().range(vorXExtent).domain([0,1]);
    var vyScale = d3.scale.linear().range(vorYExtent).domain([0,1]);
  for (var x=0.05;x<.7;x+=.05) {
    forVoronoi.push({x: vxScale(x), y: vyScale(Math.max(.75, x + .4)), color: "none"})
  }
  for (var y=0.75;y<1;y+=.05) {
    forVoronoi.push({x: vxScale(.9), y: vyScale(y), color: "none"})
  }

  for (var x=0.35;x<1;x+=.05) {
    forVoronoi.push({x: vxScale(x), y: vyScale(Math.max(.15, x + -.7)), color: "none"})
  }

    forVoronoi.push({x: vxScale(.3), y: vyScale(.05), color: "none"})
    forVoronoi.push({x: vxScale(.97), y: vyScale(.7), color: "none"})
    forVoronoi.push({x: vxScale(.98), y: vyScale(.55), color: "none"})
    forVoronoi.push({x: vxScale(.98), y: vyScale(.35), color: "none"})
    forVoronoi.push({x: vxScale(.025), y: vyScale(.05), color: "none"})
    forVoronoi.push({x: vxScale(.05), y: vyScale(.3), color: "none"})
    forVoronoi.push({x: vxScale(.55), y: vyScale(.25), color: "none"})
    forVoronoi.push({x: vxScale(.6), y: vyScale(.275), color: "none"})
    forVoronoi.push({x: vxScale(.65), y: vyScale(.275), color: "none"})
    forVoronoi.push({x: vxScale(.7), y: vyScale(.3), color: "none"})
    forVoronoi.push({x: vxScale(.75), y: vyScale(.275), color: "none"})
  }
    
  colorSet = d3.set(forVoronoi.map(function(d) {return d.color}));
  colorKeys = colorSet.values();
  
  var vM = Math.abs(vorXExtent[0] - vorYExtent[0]) * .025;
  
  voronoi = d3.geom.voronoi()
  .clipExtent([[vorXExtent[0] - vM,vorYExtent[0] - vM],[vorXExtent[1] + vM,vorYExtent[1] + vM]])
  .x(function (el) {return el.x})
  .y(function (el) {return el.y});
  
  topology = voronoi.topology(forVoronoi);
  var vorPath = d3.geo.path()
    .projection(null);

    for (x in topology.objects.voronoi.geometries) {
      topology.objects.voronoi.geometries[x].color = forVoronoi[x].color;
    }
    
    d3.select("#voronoiG").remove();
  d3.select("#mapSVG").insert("g", "#hullsG").attr("id", "voronoiG")
  .call(zoom)
  .selectAll("path")
    .data(d3.nest()
      .key(function(d) { return d.color; })
      .entries(topology.objects.voronoi.geometries).filter(function(d) {return d.key != "none"}))
  .enter().append("path")
    .attr("class", function(d) {return "voronoi voronoi-cell "+d.key})
    .style("fill", function(d) { return d.key; })
//    .style("stroke",  function(d) { return d3.hsl(d.key).darker(); })
    .style("stroke",  "black")
    .style("stroke-width", scaled(1))
    .style("stroke-dasharray", scaled(5) +","+ scaled(5))
    	.style("opacity", .5)
	.on("mouseover", vorOver)
        .on("mouseout", vorOut)
  .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
  .attr("d", function(d) { return vorPath(topojson.merge(topology, d.values)); });
  
  function vorOver(d,i) {
  var cClass = d3.select(this).style("fill");
  d3.selectAll("path.voronoi-cell").style("opacity", .25);
  d3.select(this).style("opacity", .85).style("stroke-dasharray", 0);

  d3.select("#infopopup").style("display", "block");

  var siteNumber = d3.selectAll(".sitecirctop")
  .filter(function (p,q) {return d3.select(this).style("fill") == cClass}).size();
      
  d3.select("#infocontent").html("<p>" + siteNumber + " sites in this region</p>");
  }

  function vorOut(d) {
  d3.selectAll("path.voronoi-cell").style("opacity", .7).style("stroke-dasharray", scaled(5) +","+ scaled(5))
  d3.select("#infopopup").style("display", "none");

  }
    
  function xyToArray(incArray) {
  var newArray = []    
    incArray.forEach(function (el) {
      newArray.push([el.X,el.Y]);
    })
    return newArray;
  }


  if (!cartogramRunning) {
    d3.select("#mapSVG").insert("g", "#sitesG").attr("id", "voronoiG").selectAll("path.coastlines").data(topojson.feature(exposedCoast, exposedCoast.objects.coast).features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "coastlines voronoi")
    .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
    .style("fill", "none")
    .style("stroke", "black")
    .style("pointer-events", "none")
    .style("stroke-width", scaled(1))
    ;
  }
    d3.select("#voroOffMenu").style("display", "block");

}

    function transformCoordinates (d) {
      var pathD = "M";
      for (x in d[0]) {
	pathD += ((d[0][x][0] * zoom.scale()) + zoom.translate()[0]);
	pathD += ",";
	pathD += ((d[0][x][1] * zoom.scale()) + zoom.translate()[1]);
	if (x < (d[0].length - 1)) {
	  pathD += "L";
	}
      }
      pathD += "Z";
      return pathD;
    }

function clearVoronoi() {
  d3.select("#voroOffMenu").style("display", "none");
  voronoiRunning = false;
  d3.selectAll("path.voronoi").remove();
  d3.selectAll("g.voronoi").remove();
  d3.selectAll("clipPath").remove();
}

function drawTimeline(selectedRoutes) {


  clearBottom();
  d3.selectAll(".routeComps").style("display","block");

  var timelineRoutes = [];
  d3.select("#timelineViz").selectAll(".tab").classed("backtab", true);
  d3.select("#tlbPerspective").classed("backtab", false);
  
  selectedRoutes.each(function(d) {
    timelineRoutes.push(d);
  })
  
  d3.select("#timelineViz").style("display", "block")
  var canvWidth = parseInt(d3.select("#timelineViz").style("width")) - 520;
  d3.select("#timelineSVG").attr("width", canvWidth)
  var canvHeight = parseInt(d3.select("#timelineViz").style("height"));
  var canvMargin = 20;
  
  var xMin = d3.min(timelineRoutes, function(d) {return d3.min(d.coordinates, function(p) {return p[0]})});
  var xMax = d3.max(timelineRoutes, function(d) {return d3.max(d.coordinates, function(p) {return p[0]})});
  var yMin = d3.min(timelineRoutes, function(d) {return d3.min(d.coordinates, function(p) {return p[1]})});
  var yMax = d3.max(timelineRoutes, function(d) {return d3.max(d.coordinates, function(p) {return p[1]})});
  
  var roughXScale = d3.scale.linear().domain([xMin,xMax]).range([(canvMargin * 3), canvWidth - (canvMargin * 3)]);
  var roughDistortedXScale = d3.scale.linear().domain([xMin,xMax]).range([(canvMargin * 3), canvWidth - (canvMargin * 3)]).nice();
  var roughYScale = d3.scale.linear().domain([yMax,yMin]).range([canvMargin, canvHeight - canvMargin]);

  var roughLineConstructor = d3.svg.line()
  .x(function(d) {return roughXScale(d[0])})
  .y(function(d) {return roughYScale(d[1])});

  var roughDistortedLineConstructor = d3.svg.line()
  .x(function(d) {return roughDistortedXScale(d[0])})
  .y(function(d) {return roughYScale(d[1])});
  
  d3.select("#timelineSVG").selectAll("path.timelineRoutes").data(timelineRoutes).enter().append("path")
  .style("fill", "none")
  .style("stroke", function(d) {return typeHash[d.properties.segment_type]})
  .attr("d", "M1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1")
  .style("stroke-width", "4px")
  .attr("class", "timelineRoutes")
  .on("mouseover", resultsOver)
  .on("mouseout", resultsOut);
  
  var timelineSites = []
  timelineRoutes.forEach(function (el) {
    if (timelineSites.indexOf(el.properties.source) == -1) {
      timelineSites.push(el.properties.source);
    }
    if (timelineSites.indexOf(el.properties.target) == -1) {
      timelineSites.push(el.properties.target);
    }
  })

  d3.select("#timelineSVG")
  .selectAll("g.timelineSites").data(timelineSites).enter().append("g")
  .attr("class", "timelineSites")
  .on("mouseover", function(d) {this.parentNode.appendChild(this);d3.select("#site_g_" + d.id).select(".sitecirc").style("stroke", "red").style("stroke-width", scaled(50));d3.select(this).selectAll("text").style("display", "block")})
  .on("mouseout", function(d) {d3.select("#site_g_" + d.id).select(".sitecirc").style("stroke", "none");d3.select(this).selectAll("text").style("display", "none")});
  
  d3.selectAll("g.timelineSites").append("circle").style("fill", "white").style("stroke", "black").style("stroke-width", "1px").attr("r", 4);

  d3.selectAll("g.timelineSites")
  .append("text").style("pointer-events", "none").attr("y", -5).style("display", "none").style("text-anchor", "middle").style("fill", "white").style("stroke", "white").style("stroke-width", "3px").style("opacity",.75).style("font-weight", 900).text(function(d) {return d.label})
  
  d3.selectAll("g.timelineSites")
  .append("text").style("pointer-events", "none").attr("y", -5).style("display", "none").style("text-anchor", "middle").style("font-weight", 600).text(function(d) {return d.label})
  
  timelineBy("perspective");
  d3.select("#tlbPerspective").on("click", function() {timelineBy("perspective");})
  d3.select("#tlbDuration").on("click", function() {timelineBy("duration");})
  d3.select("#tlbExpensed").on("click", function() {timelineBy("expensed");})
  d3.select("#tlbExpensew").on("click", function() {timelineBy("expensew");})
  d3.select("#tlbExpensec").on("click", function() {timelineBy("expensec");})
  d3.select("#tlbDistance").on("click", function() {timelineBy("distance");})
  
  function timelineBy(distortionType) {

    if (distortionType == "perspective") {
      roughYScale.range([canvMargin, canvHeight - canvMargin]);
      d3.selectAll("g.timelineSites")
      .transition()
      .duration(1000)
      .attr("transform", function(d) {return "translate(" + roughXScale(d.x) + "," + roughYScale(d.y) + ")"})

     d3.selectAll("path.timelineRoutes")
      .transition()
      .duration(1000)
       .attr("d", function(d) {return roughLineConstructor(d.coordinates)})

      d3.select("#tlXLabel").text("Latitude")
      d3.select("#tlYLabel").text("Longitude")
      
      updateAxis(roughXScale);

       return;
    }
      d3.select("#tlYLabel").text("")
      roughYScale.range([60, 60]);

    
      var totalTime = timelineRoutes.reduce(function(a,b) {return a + b.properties.segmentduration},0);
      var totalLength = timelineRoutes.reduce(function(a,b) {return a + b.properties.segmentlength},0);
      var totalCostD = timelineRoutes.reduce(function(a,b) {return a + b.properties.segmentexpense_d},0);
      var totalCostW = timelineRoutes.reduce(function(a,b) {return a + b.properties.segmentexpense_w},0);
      var totalCostC = timelineRoutes.reduce(function(a,b) {return a + b.properties.segmentexpense_c},0);
    
    if (distortionType == "duration") {
      roughDistortedXScale.domain([0,totalTime]);
      propType = "segmentduration"
      d3.select("#tlXLabel").text("Days")
    }
    if (distortionType == "distance") {
      roughDistortedXScale.domain([0,totalLength]);
      propType = "segmentlength"
      d3.select("#tlXLabel").text("Kilometers") 
     }
    if (distortionType == "expensed") {
      roughDistortedXScale.domain([0,totalCostD]);
      propType = "segmentexpense_d";
      d3.select("#tlXLabel").text("Denarii") 
    }
    if (distortionType == "expensew") {
      roughDistortedXScale.domain([0,totalCostW]);
      propType = "segmentexpense_w";
      d3.select("#tlXLabel").text("Denarii") 
    }
    if (distortionType == "expensec") {
      roughDistortedXScale.domain([0,totalCostC]);
      propType = "segmentexpense_c";
      d3.select("#tlXLabel").text("Denarii") 
    }
    updateAxis(roughDistortedXScale);

    var steppingPoint = siteHash[routesRun[currentRoute - 1].source];
      var currentCost = 0;
      var moreRoutes = true;
      var calculatedRoutes = [];
      var i = 0
      while (moreRoutes && i < 1000) {
	for (x in timelineRoutes) {
	  if (calculatedRoutes.indexOf(timelineRoutes[x]) == -1) {
	    if (timelineRoutes[x].properties.source == timelineRoutes[x].properties.target) {
	      calculatedRoutes.push(timelineRoutes[x]);	      
	    }
	    else if (timelineRoutes[x].properties.source == steppingPoint) {
	      steppingPoint.tlCost = currentCost;
	      currentCost += timelineRoutes[x].properties[propType];
	      steppingPoint = timelineRoutes[x].properties.target;
	      calculatedRoutes.push(timelineRoutes[x]);
	    }
	    else if (timelineRoutes[x].properties.target == steppingPoint) {
	      steppingPoint.tlCost = currentCost;
	      currentCost += timelineRoutes[x].properties[propType];
	      steppingPoint = timelineRoutes[x].properties.source;
	      calculatedRoutes.push(timelineRoutes[x]);
	    }
	  }
	}
	  if (calculatedRoutes.length == timelineRoutes.length) {
	      steppingPoint.tlCost = currentCost;
	    moreRoutes = false;
	  }
	  i++;
      }
      
      d3.selectAll("g.timelineSites")
      .transition()
      .duration(1000)
      .attr("transform", function(d) {return "translate(" + roughDistortedXScale(d.tlCost) + "," + roughYScale(d.y) + ")"});

     d3.selectAll("path.timelineRoutes")
      .transition()
      .duration(1000)
      .attr("d", function(d) {return roughDistortedLineConstructor([[d.properties.source.tlCost,d.properties.source.y],[d.properties.target.tlCost,d.properties.target.y]])})

      return;
    
  }
  function updateAxis(incXScale) {
      var tlXAxis = d3.svg.axis().scale(incXScale).orient("bottom").tickSize(-80).ticks(6).tickSubdivide(true);    
//      var tlYAxis = d3.svg.axis().scale(roughYScale).orient("left").tickSize(10).ticks(3).tickSubdivide(true);  
      d3.select("#tlXAxis").transition().duration(1000).call(tlXAxis);
//      d3.select("#tlYAxis").transition().duration(1000).call(tlYAxis);
      d3.selectAll(".tlAxis").selectAll("path").style("stroke", "none").style("fill", "#FAFAE6").style("opacity", .5)
      d3.selectAll(".tlAxis").selectAll("line").style("stroke", "black").style("stroke-width", "1px")
      d3.selectAll(".tlAxis").selectAll("line.minor").style("stroke", "gray").style("stroke-width", "1px").style("stroke-dasharray", "5 5")
      if (d3.select("#tlXLabel").text() == "Latitude") {
	d3.select("#tlXAxis").select("g.tick").select("text").remove();
      }
  }
}

function resultsOver(d) {
  d3.selectAll(".timelineRoutes").filter(function(p) {return p.properties.segment_id == d.properties.segment_id}).style("stroke-width", "8px");
  d3.selectAll(".results").filter(function(p) {return p.properties.segment_id == d.properties.segment_id}).style("stroke", "red")
}

function resultsOut(d) {
  d3.selectAll(".timelineRoutes").style("stroke-width", "4px");
  d3.selectAll(".results").filter(function(p) {return p.properties.segment_id == d.properties.segment_id}).style("stroke", function(d) {return d.properties.fixedColor})
}

function simplifyLines(selectedLines) {
      var simpleGeom = [];
      selectedLines.each(function(d,i) {
      var segLength = d3.select(this).node().getTotalLength();
	var simplifiedObject = {coordinates: [], type:"LineString", id: d.id, properties: d.properties};
      for (x=0;x<=1;x+=.1) {
	var segPoint = d3.select(this).node().getPointAtLength(segLength * x);
	var segPointProjected = projection.invert([segPoint.x,segPoint.y])
	simplifiedObject.coordinates.push([segPointProjected[0],segPointProjected[1]]);	
	}
	simplifiedObject.cartocoords = simplifiedObject.coordinates;
	simpleGeom.push(simplifiedObject);
	})
      return simpleGeom;
}

function switchControls(switchType) {
  d3.select("#controlbarScroller").selectAll('.tab').classed('backtab',true);
  
    d3.selectAll(".calculateButton").style("display", "none");
  if (switchType == "cartogram") {
    
  d3.select("#cartTab").classed('backtab', false);
    d3.select("#controlbar").style("background", "rgba(52,51,53,.85)");
      d3.select("#cartoCalculateButton").style("display", "inline");
    d3.select("#targetSelectButton").style("display", "none");
    d3.select("#targetSelectLabel").style("display", "none");
    d3.select("#sourceSelectLabel").html("CENTER");
    d3.select("#directionDiv").style("display", "block");
  }
  else if (switchType == "Minard") {
  d3.select("#minTab").classed('backtab', false);
    d3.select("#controlbar").style("background", "rgba(39,38,40,.85)");
    d3.select("#sankeyCalculateButton").style("display", "inline");
    d3.select("#targetSelectButton").style("display", "none");
    d3.select("#targetSelectLabel").style("display", "none");
    d3.select("#sourceSelectLabel").html("CENTER");
    d3.select("#directionDiv").style("display", "block");    
  }
  else {
   d3.select("#routTab").classed('backtab', false);
       d3.select("#controlbar").style("background", "rgba(65,64,66,.85)");
   d3.select("#routeCalculateButton").style("display", "inline");
    d3.select("#targetSelectLabel").style("display", "block");
    d3.select("#sourceSelectLabel").html("FROM");
    d3.select("#directionDiv").style("display", "none");
  }
}

function calculateCarto() {
  cartogram(getSettings().source);
}

function calculateSankey() {
    flowsRun.push(getSettings());
  geoSankey(getSettings().source);
}

function exportCartoCSV() {
    _gaq.push(['_trackEvent', 'ui', 'exportCSV', 'exportCSV']);

  var fullCenters = activeCenter();
  var centers = d3.keys(fullCenters);
  var newPageBegin = "<html><head><title>Exported Cartogram Data</title></head><style>div: {width:100%;}</style><body><pre>";
  var newPageEnd = "</pre></body></html>";
  var newPageContent = '"id","label","x","y","betw","cluster"'
  for (x in cartogramsRun) {
    if (centers.indexOf(""+x) > -1) {
      newPageContent += ',"' + siteHash[cartogramsRun[x].centerID].label + '"';
    }
  }
  newPageContent += "\r";
  
  for (x in exposedsites) {
    newPageContent += exposedsites[x].id + ',"' + exposedsites[x].label + '",' + exposedsites[x].x + ',' + exposedsites[x].y + ',' + exposedsites[x].betweenness + ',' + exposedsites[x].nearestCluster;
    for (y in exposedsites[x].cost) {
      if (centers.indexOf(""+y) > -1) {
	newPageContent += "," + exposedsites[x].cost[y];
      }
    }
    newPageContent += "\r";
  }
  
  var opened = window.open("", "_blank");
  window.focus();
  opened.document.write(newPageBegin + newPageContent + newPageEnd);
  
  window.URL = (window.URL || window.webkitURL);
  

  var downloadButton = d3.select("#downloadButton").style("display", "inline");
  
downloadButton.on("mouseover", function() {
  var url = window.URL.createObjectURL(new Blob([newPageContent], { "type" : "application\/csv" }));

    // Restore non-filtered content.
//    processFiles();

    downloadButton
        .attr("download", "cartogram.csv")
        .attr("href", url)
        .on("mouseout", function(){
          setTimeout(function() {
            window.URL.revokeObjectURL(url);
          }, 10);
        });
  });
}

function exportSVG() {
    _gaq.push(['_trackEvent', 'ui', 'exportSVG', 'exportSVG']);

d3.selectAll("path.links").style("fill", "none");
  var newPageContent = "<svg " + d3.select("#vizContainer").node().innerHTML.split("<svg ")[2]

  window.URL = (window.URL || window.webkitURL);
  
  var downloadButton = d3.select("#svgDownload").style("display", "inline");
  
downloadButton.on("mouseover", function() {
  var url = window.URL.createObjectURL(new Blob([newPageContent], { "type" : "application\/svg" }));

// Restore non-filtered content.
//    processFiles();

    downloadButton
        .attr("download", "orbis.svg")
        .attr("href", url)
        .on("mouseout", function(){
          setTimeout(function() {
            window.URL.revokeObjectURL(url);
          }, 10);
        });
  });
}


function activeCenter() {
  var foundArray = [];
  var indexArray = {};
  d3.selectAll(".cartoOpt").each(function() {this.checked ? foundArray.push(parseInt(this.value)) : null})
  
  for (x in cartogramsRun) {
    if (foundArray.indexOf(parseInt(x)) > -1) {
      indexArray[x] = cartogramsRun[x];
    }
  }
  
  return indexArray;
}

function mapOff(opacSetting) {
  opacSetting = opacSetting || 0;
  if (d3.select("#rasterG").style("opacity") == opacSetting) {
    d3.select("#rasterG").style("opacity", 1);
    d3.select("#terrainOnButton > input").property("checked", true);
  }
  else {
    d3.select("#rasterG").style("opacity", opacSetting);
    d3.select("#terrainOnButton > input").property("checked", false);
  }
}

function sitesOff(override) {
  if (d3.select("#sitesOnButton > input").property("checked") || override) {
    displaySites = false;
    d3.select("#sitesOnButton > input").property("checked", false);
  }
  else {
    displaySites = true;
    d3.select("#sitesOnButton > input").property("checked", true);
  }
  zoomInitialize();
  zoomComplete();
}

function networkOff(override) {
    if (networkOn || override) {
    d3.selectAll("path.routes").style("display", "none");
    d3.select("#networkOnButton > input").property("checked", false);
    networkOn = false;
  }
  else {
    d3.select("#routesContainer").style("opacity", 1);
    d3.selectAll("path.routes").style("display", "block");
    d3.select("#networkOnButton > input").property("checked", true);
    networkOn = true;
  }
  zoomInitialize();
  zoomComplete();
  
}

function temporaryLabels(override) {
  if (d3.select("#labelsOnButton > input").property("checked") || override) {
    d3.selectAll(".hoverlabel").remove();
    d3.select("#labelsOnButton > input").property("checked", false);
    tempLabels = false;
  }
  else {
    d3.selectAll("g.site").each(function(d,i) {siteOver(d,i,this)});
    d3.select("#labelsOnButton > input").property("checked", true);
    tempLabels = true;
  }
}

function zoomManual(zoomDirection) {

  if (zoomDirection == "in") {
    if (zoom.scale() >= 131072) {
      return;
    }
var newZoom = zoom.scale() * 1.5;
var newX = ((zoom.translate()[0] - (width / 2)) * 1.5) + width / 2;
var newY = ((zoom.translate()[1] - (height / 2)) * 1.5) + height / 2;
  }
  else {
    if (zoom.scale() <= 4096) {
      return;
    }
var newZoom = zoom.scale() * .75;
var newX = ((zoom.translate()[0] - (width / 2)) * .75) + width / 2;
var newY = ((zoom.translate()[1] - (height / 2)) * .75) + height / 2;    
  }

zoom.scale(newZoom).translate([newX,newY])
  zoomComplete();
}

function geoSankey(centerID) {
    var newSettings = getSettings();
  newSettings["centerID"] = centerID;
  sankeyHash = {};

  d3.select(".calculateDisable").style("display", "block");
  minardQuery = "sankey_carto.php?v="+newSettings.vehicle+"&m="+newSettings.month+"&c="+centerID+"&tr="+newSettings.riverTransfer+"&ts="+newSettings.seaTransfer+"&p="+newSettings.priority+"&ml="+newSettings.modes+"&el="+newSettings.excluded+"&d="+newSettings.direction;

      _gaq.push(['_trackEvent', 'query', "minard", centerID]);

  d3.csv(minardQuery, function(error,cartoData) {
    d3.select(".calculateDisable").style("display", "none");
    for (x in cartoData) {
      sankeyHash[cartoData[x].source + "-" + cartoData[x].target] = cartoData[x].freq;
      sankeyHash[cartoData[x].target + "-" + cartoData[x].source] = cartoData[x].freq;
    }
    
    freqMax = d3.max(cartoData.filter(function (el) {return el.source != el.target}), function (d) {return parseInt(d.freq)});
    freqScale = d3.scale.linear().domain([1,2,4,8,16,32,64,128,256,freqMax]).range([2,4,6,8,10,13,16,19,22,25]);
    freqColor = d3.scale.linear().domain([1,10,25,50,100,200,freqMax]).range(colorbrewer.Purples[7]);

    d3.selectAll("path.routes").each(
      function(d) {
      var realSource = d.properties.sid.toString().length == 6 ? d.properties.sid.toString().substring(1,6) : d.properties.sid;
      var realTarget = d.properties.tid.toString().length == 6 ? d.properties.tid.toString().substring(1,6) : d.properties.tid;
      if (sankeyHash[realSource+"-"+realTarget]) {
	d.properties.fixedWidth = freqScale(sankeyHash[realSource+"-"+realTarget]);
  	d.properties.fixedColor = "black";
	d.properties.lastFreq = parseInt(sankeyHash[realSource+"-"+realTarget]);
      }
      else {
	d.properties.fixedWidth = 1;
	d.properties.fixedColor = "none";
	d.properties.lastFreq = 0;
      }
      })
  zoomComplete();
  addFlowRow(newSettings);  
  clearBottom();
  
  var newLegendG = d3.select("#timelineSVG").append("g").attr("transform", "translate(50,70)").attr("class", "legend")
  d3.select("#timelineViz").insert("div", ".tab").attr("id", "lTitle").html("<div style='margin:10px;font-size:24px;width:100%;'>Flow " + directionHash[newSettings.direction] + " " + siteHash[centerID].label +'<p>')

//  legendHistogram(cartoData.map(function(d) {return parseInt(d.freq)}), [0,1,2,4,18,16,32,64,128,256,freqMax]);

  newLegendG.selectAll("path")
  .data([1,2,4,8,16,32,64,128,256,freqMax])
  .enter()
  .append("line")
  .attr("x1", function (d,i) {return (i * 40)})
  .attr("x2", function (d,i) {return (i * 40) + 40})
  .attr("y1", function (d) {return freqScale(d) / 2})
  .attr("y2", function (d) {return freqScale(d) / 2})
  .attr("stroke", "black")
  .attr("stroke-width", function (d) {return freqScale(d)})
  
  newLegendG.selectAll("text")
  .data([1,2,4,8,16,32,64,128,256,freqMax])
  .enter()
  .append("text")
  .attr("x", function (d,i) {return (i * 40) + 20})
  .attr("y", function (d) {return -3})
  .text(function(d) {return d})
  .attr("text-anchor", "middle")

  d3.select("#routeResults").html("<div style='margin-top:35px;font-size:20px;text-align:right;width:100%;'>Number of routes " + directionHash[newSettings.direction].toLowerCase() + " " + siteHash[centerID].label +' that share a common segment<p>')
  
  var topFiveSegments = d3.entries(sankeyHash).map(function(d) {return {s: d.key.split("-")[0], t: d.key.split("-")[1], c: parseInt(d.value)}}).filter(function (d) {return d.s < d.t && siteHash[d.s] && siteHash[d.t]}).filter(function(d) {return siteHash[d.s].rank > 10 && siteHash[d.t].rank > 10}).sort(function(a,b) {
    if (a.c < b.c)
    return 1;
    if (a.c > b.c)
    return -1;
    return 0;
    }).slice(0,4)

  var routeModalContents = d3.select("#routeResults").html('')
  var leftDiv = routeModalContents.append("div").attr("class", "rrLeft").style("width", "250px")
  var midDiv = routeModalContents.append("div").attr("class", "rrMid").style("width", "310px")
//  var rightDiv = routeModalContents.append("div").attr("class", "rrRight").style("width", "215px")
  leftDiv.append("p").html("The " + priorityType[newSettings.priority] + " routes "+ directionHash[newSettings.direction].toLowerCase() +" <span class='boldRed'>" + siteHash[centerID].label + "</span> to the rest of the Roman world in <span class='bold'>" + monthNames[newSettings.month] + "</span> share these common segments.")
  midDiv.append("p").html("The most active segments are:").style("padding-bottom", "0")
  var rrList = midDiv.append("ul").style("margin-top", "0")
  rrList.selectAll("li").data(topFiveSegments).enter().append("li")
  .html(formatSegment)
  
  function formatSegment(d) {
    return siteHash[d.s].label + " to " + siteHash[d.t].label + " (" + d.c + ")";
  }

  
  })
  mapOff(.2);
  d3.select("#sankeyButton").style("display", "inline")
  d3.selectAll(".sitecirc").classed("sourcecirc", false);
  d3.selectAll(".sitecirc").classed("targetcirc", false);
  d3.selectAll(".slabel").classed("underlined", false);
  siteLabel("site_g_"+centerID,true);

  sitesOff(true);
  zoomInitialize();
  zoomComplete();
}

function sankeyOff() {
      d3.select("#sankeyButton").style("display", "none");
      mapOff(1);
      d3.selectAll("path.routes").each(
      function(d) {
	d.properties.fixedWidth = 2;
  	d.properties.fixedColor = typeHash[d.properties.t];
      })
      zoomComplete();
}

function createEssay(essayName) {
  d3.select("#essayBox").style("display", "block");
  d3.select('#essayContent').style('display','block');

  var essayPath="building.html";
    switch(essayName)
  {
    case 'home':
    essayPath="assets/intro.html"
    break;
    case 'intro':
    essayPath="assets/introducing.html"
    break;
    case 'understand':
    essayPath="assets/understanding.html"
    break;
    case 'build':
    essayPath="assets/building.html"
    break;
    case 'tutorial':
    essayPath="assets/using.html"
    break;
    case 'gallery':
    essayPath="assets/gallery.html"
    break;
    case 'scholarship':
    essayPath="assets/apply_TOC.html"
    break;
    case 'geospatial':
    essayPath="assets/build_gt.html"
    break;
    case 'news':
    essayPath="assets/new.html"
    break;
    case 'media':
    essayPath="assets/media.html"
    break;
    case 'credits':
    essayPath="assets/credits.html"
    break;
  }
  
  if (essayName != "home") {
      _gaq.push(['_trackEvent', 'essay', essayName, essayName]);
  }
  
  d3.selectAll(".navtab").classed("active", false);
  d3.selectAll(".navtab").filter(function() {return d3.select(this).attr("data") == essayName}).classed("active", true)
  

  
d3.text(essayPath, function(data) {
  d3.select("#essayContent").select("#insertedData").remove();
  d3.select("#essayContent").append("div").attr("id", "insertedData").html(data).node().scrollTop = 0;
})
}

function closeEssay() {
  d3.select("#stickynote").transition().duration(2000).style("opacity", 1).transition().delay(3000).style("opacity", 1).transition().duration(2000).style("opacity", 0);
  d3.select('#essayBox').style('display','none');
  d3.select('#essayContent').style('display','none');
  d3.select('#clustermodalBack').style('display','none');
  d3.select('#resultsTableBack').style('display','none');
  d3.select('#tutorialpopup').style('display','none');
  d3.select('#infopopup').style('display','none');
  stopBrushing();
}

function changePriority(chPriority) {
  var priorityTypes = [{l: 'Foot (30km/day)',v: 'foot',p:"f"},
	 {l: 'Oxcart (12km/day)',v: 'oxcart',p:"f"},
	 {l: 'Porter (30km/day)',v: 'porter',p:"f"},
	 {l: 'Horse (56km/day)',v: 'horse',p:"f"},
	 {l: 'Private (36km/day)',v: 'privateroutine',p:"f"},
	 {l: 'Private (50km/day)',v: 'privateaccelerated',p:"f"},
	 {l: 'Fast Carriage (67km/day)',v: 'fastcarriage',p:"f"},
	 {l: 'Horse Relay (250km/day)',v: 'horserelay',p:"f"},
	 {l: 'Rapid Military March (60km/day)',v: 'rapidmarch',p:"f"},
	 {l: 'Donkey',v: 'donkey',p:"c"},
	 {l: 'Wagon', v:'wagon',p:"c"},
	 {l: 'Passenger in Carriage', v:'carriage',p:"c"}]

  d3.selectAll("option.vehicleType").remove();
  d3.select("#vehicleSelectButton").selectAll("option")
  .data(priorityTypes.filter(function(d) {return d.p==chPriority}))
  .enter()
  .append("option")
  .html(function(d) {return d.l})
  .attr("value", function(d,i) {return d.v})
  .attr("class", "vehicleType");

    if (chPriority == "f") {
      document.getElementById("vehicleSelectButton").value = 'foot';
  }
  else {
      document.getElementById("vehicleSelectButton").value = 'donkey';
  }

}

window.onresize = function(event) {
	resizeMap();
}

function resizeMap() {
  var mm = 55;
        if (timelineOpen == true) {
	  mm = 168;
	}
	height = parseFloat(document.getElementById("mapSVG").clientHeight || document.getElementById("mapSVG").parentNode.clientHeight);
	width = parseFloat(document.getElementById("mapSVG").clientWidth || document.getElementById("mapSVG").parentNode.clientWidth);
	tile.size([width, height]);
	d3.select("g.zoom").select("rect").attr("height", height).attr("width", width)
	d3.select("#rightControls").style("height", (height - mm) + "px");
	d3.select("#controlbarScroller").style("height", (height - mm - 95) + "px");

}

function resetMap() {
  sankeyOff();
  clearVoronoi();
  stopBrushing();
  massSiteChange('all');
  cartogramOff();
  if (networkOn == false) {
    networkOff();
  }
  function fireClick(node){
	if ( document.createEvent ) {
		var evt = document.createEvent('MouseEvents');
		evt.initEvent('click', true, false);
		node.dispatchEvent(evt);	
	} else if( document.createEventObject ) {
		node.fireEvent('onclick') ;	
	} else if (typeof node.onclick == 'function' ) {
		node.onclick();	
	}
}

d3.selectAll("button.delete").each(function () {
  fireClick(this);
})
}

function seaSwitch(el) {
  switch (el.value) {
    case "day":
      d3.select('#overseasModeCheck').node().value = '';
      d3.select('#coastModeCheck').node().value = 'dayfast';
      break;
    case "slow":
      d3.select('#overseasModeCheck').node().value = 'slowsea';
      d3.select('#coastModeCheck').node().value = 'slowcoast';
      break;
    case "fast":
      d3.select('#overseasModeCheck').node().value = 'overseas';
      d3.select('#coastModeCheck').node().value = 'coastal';
      break;
  }
}

function riverSwitch(el) {
  switch (el.value) {
    case "civ":
      d3.select('#riverModeCheck').node().value = 'upstream,downstream';
      break;
    case "mil":
      d3.select('#riverModeCheck').node().value = 'fastup,fastdown';
      break;
  }
}

function showHide(containerName) {
  switch (containerName) {
    case "networkModes":
      d3.select("#networkModeContainer").style("height") == "20px" ? d3.select("#networkModeContainer").transition().duration(500).style("height", "215px") : d3.select("#networkModeContainer").transition().duration(500).style("height", "20px")
      break;
    case "aquaticOptions":
      d3.select("#aquaticOptionsContainer").style("height") == "20px" ? d3.select("#aquaticOptionsContainer").transition().duration(500).style("height", "65px") : d3.select("#aquaticOptionsContainer").transition().duration(500).style("height", "20px")
      break;
    case "displayOptions":
      d3.select("#displayOptionsContainer").style("height") == "18px" ? d3.select("#displayOptionsContainer").transition().duration(500).style("height", "115px") : d3.select("#displayOptionsContainer").transition().duration(500).style("height", "18px")
      break;
    case "travelMonth":
	d3.select("#monthPicker").selectAll("*").style("display", "inline-block");
	d3.selectAll(".season").style("display", "none");	
	d3.select("input.season").property("checked", true)
	d3.select("#jul").property("checked", true)
	d3.select("#travelMonthLabel").html("Month of Departure");
      break;
    case "travelSeason":
      	d3.select("#monthPicker").selectAll("*").style("display", "none");
	d3.selectAll(".season").style("display", "inline");
	d3.selectAll("label.season").style("display", "inline-block");
	d3.select("#summer").property("checked", true)
	d3.select("#travelMonthLabel").html("Season of Departure");
	break;
    case "leftPanel":
      	d3.select("#controlbar").style("left") == "15px" ? d3.select("#controlbar").transition().duration(500).style("left", "-350px") : d3.select("#controlbar").transition().duration(500).style("left", "15px");
	d3.select("#closeLeft").classed("rightarrow") ? d3.select("#closeLeft").classed("rightarrow", false).classed("leftarrow", true) : d3.select("#closeLeft").classed("rightarrow", true).classed("leftarrow", false);
	break;
    case "rightPanel":
      	if (d3.select("#rightControls").style("right") == "15px") {
	  d3.select("#rightControls").transition().duration(500).style("right", "-300px")
	  d3.select("#mapControls").transition().duration(500).style("right", "60px")
	}
	else {
	  d3.select("#rightControls").transition().duration(500).style("right", "15px")
	  d3.select("#mapControls").transition().duration(500).style("right", "200px")
	}
	d3.select("#closeRight").classed("rightarrow") ? d3.select("#closeRight").classed("rightarrow", false).classed("leftarrow", true) : d3.select("#closeRight").classed("rightarrow", true).classed("leftarrow", false);
	break;
    case "bottomPanel":
      	if (d3.select("#timelineViz").style("bottom") == "20px") {
	  d3.select("#timelineViz").transition().duration(500).style("bottom", "-300px");
	  timelineOpen = false;
	}
	else {
	  d3.select("#timelineViz").transition().duration(500).style("bottom", "20px");
	  timelineOpen = true;
	}
	d3.select("#closeBottom").classed("downarrow") ? d3.select("#closeBottom").classed("downarrow", false).classed("uparrow", true) : d3.select("#closeBottom").classed("downarrow", true).classed("uparrow", false);
	break;
  }
  resizeMap();

}

function psStyle() {
    lastCartoRan;
    runCarto(siteHash[cartogramsRun[lastCartoRan].centerID].x,siteHash[cartogramsRun[lastCartoRan].centerID].y,cartogramsRun[lastCartoRan].centerID, lastCartoRan);
    d3.select("#legendmodal").style("left", "310px").style("width", "650px")
    drawBorders(["Three", "Four"]);
    psEffects = true;

    var iL = [50024,50017,50107,50429,50235,50129,50327,50359,50379,50124,50549,50213];
    var iN = ["(Antioch)","","(Tunis)","(Lyon)","(London)","(Istanbul)","(Rome)","(Sremska Mitrovica)","(Tarragona)","(Trier)","(Corinth)","(Jerusalem)"];
    
    for(x in iL) {
      d3.select("#site_g_" + iL[x]).append("text").text(iN[x]).attr("class", "pslabel").style("stroke", "white").style("pointer-events", "none")
      d3.select("#site_g_" + iL[x]).append("text").text(iN[x]).attr("class", "pslabel").style("pointer-events", "none")
    }
    zoomComplete();
}

function legendHistogram(data, b) {
  var histoHeight = 50;
  
  var histoData = d3.layout.histogram()
    .bins(b)
    (data);
    
      var yHisto = d3.scale.linear()
    .domain([0, d3.max(histoData, function(d) {return d.length})])
    .range([histoHeight, 0]);
  
  var bar = d3.select("#timelineSVG")
  .append("g")
  .attr("class", "histo")
  .attr("transform","translate(500,20)").selectAll(".bar")
    .data(histoData)
  .enter().append("g")
    .attr("class", "bar")
    .attr("transform", function(d,i) { return "translate(" + (i * 20) + "," + yHisto(d.length) + ")"; })
    .style("display", "none")

bar.append("rect")
    .attr("x", 1)
    .attr("width", 20)
    .attr("height", function(d) { return histoHeight - yHisto(d.length); })
    .style("fill", "pink")
    .style("stroke", "black")
    .style("stroke-width", "1px");

}

function changeStyleDots() {
  if (d3.select("#dotSyleOnButton > input").property("checked") == true) {
  d3.select("#dotSyleOnButton > input").property("checked", false)
    dotStyle = false;
  }
  else {
  if (displaySites == false) {
    sitesOff();    
  }
  dotStyle = true;
  d3.select("#dotSyleOnButton > input").property("checked", true)
  }
  zoomInitialize();
  zoomComplete();
}

function changeStyleLines() {
    _gaq.push(['_trackEvent', 'ui', 'pathColoring', 'pathColoring']);
  if(!networkOn) {
    networkOff();
  }
    d3.selectAll("path.routes").style("stroke", function (d) {return d3.interpolateHcl(d.properties.source.fixedColor, d.properties.target.fixedColor)(.5)});
}

function zoomToSite(d) {
  var x = (d3.transform(d.cartoTranslate).translate[0] * zoom.scale()) + (width / 2);
  var y = (d3.transform(d.cartoTranslate).translate[1] * zoom.scale()) + (height / 2);
  zoom.scale(8192).translate([x,y]);
  zoomComplete();
}

function clearBottom() {
  d3.selectAll("g.legend").remove();
  d3.selectAll(".timelineRoutes").remove();
  d3.selectAll("g.timelineSites").remove();
  d3.selectAll("g.histo").remove();
  d3.select("#lTitle").remove();
  d3.selectAll(".routeComps").style("display", "none");
}

function contextualHelp(helpString) {
  var helpText = "No help text found for " +helpString;
  switch(helpString) {
    case "transfer":
      helpText = "<h3 class='contextHelpHead'>Transfer Cost</h3><p>Accounts for the cost involved in transfers between different types of transportation by adding the selected number of days or denarii to any change from or to travel by road, river and sea.</p>"
      break;
    case "advanced":
      helpText = "<p>Define your own custom costs for each mode.</p><p>This isn't currently operational.</p>"
      break;      
    case "voronoi":
      helpText = "<h3 class='contextHelpHead'>Generating Zones</h3><p>Once a network has been calculated, this function displays cost contours that show which sites share a specific range of transportation costs from or to the selected start or end point. The relevant costs are reported in the legend that appears in the lower right hand corner. This perspective helps capture the structural properties and logistical constraints of the of the Roman imperial system as a whole.</p>"
      break;      
    case "cluster":
      helpText = "<h3 class='contextHelpHead'>Cluster Sites</h3><p>This function shows which sites are closest (in terms of connectivity cost) to the center points of two or more cartograms. Proceed in the following steps: 1. Generate two or more cartograms. 2. Use the &ldquo;Cluster&rdquo; button to open a pop-up window that allows you to specify priority and frontier tolerance (explained in the window). 3. Use the &ldquo;Execute&rdquo; button in the window. All sites assume the color of the closest center point, as explained in a second pop-up window. 4. The &ldquo;Zones&rdquo; button allows you to display each cluster as a colored region. By moving your cursor into a given cluster you can see the number of sites in that cluster. 5. Using the &ldquo;Georectify&rdquo; button matches each cluster to a conventional map. 6. It is always possible to add further cartograms or unselect previous ones (in the first pop-up window). You may also generate Minard diagrams that will be superimposed on the existing clusters.</p>"
      break;
    case "exportsvg":
      helpText = "<h3 class='contextHelpHead'>Export SVG File</h3><p>You can download the map in vector format which will allow you to edit it in Inkscape or Adobe Illustrator. The downloaded map will not include terrain.</p>"
      break;
    case "route":
      helpText = "<p>A route is the most efficient path from the starting point to the destination based on your selections.</p>"
      break;
    case "cartogram":
      helpText = "<p>The network function calculates the cost between one site (center) and all other sites based on your selections.</p>"
      break;
    case "minard":
      helpText = "<p>A Minard Diagram calculates all the most efficient routes from or to the selected site and aggregates them to show the most used paths.</p>"
      break;
    case "frontier":
      helpText = "<h3 class='contextHelpHead'>Frontier Settings</h3><p>In the default setting for clustering (0.0), sites are assigned to a given cluster strictly based on the lowest connectivity cost to or from a given center. You can relax this principle by i dentifying sites that are up to   x percent costlier to reach from an alternative center. These overlapping layers create a 'frontier.' For example, a tolerance setting of 0.2 identifie s all sites whose connectivity cost from multiple centers differs by no more than 20 percent. The higher the tolerance setting, the more sites fall into this intermediate 'frontier' zone between centers.</p>"
      break;      
    case "shipmodel":
      helpText = "<h3 class='contextHelpHead'>Ship Model</h3><p>Sea routes are calculated with two models for faster and slower ships and differ in terms of routing and speed. The Daylight option restricts sea travel to coastal routes during daylight hours, using the faster ship model. This results in greater travel times, which vary by season depending on the length of day and night."
      break;      
    case "georectify":
      helpText = "<h3 class='contextHelpHead'>Georectify Sites and Routes</h3><p>Returns the sites in a cartogram to their correct geographical position. The coloring of the sites continues to reflect their cost distance from or to the selected starting or end point (for a single cartogram), or indicates which cluster they belong to (if the clustering function has been used). Once the sites have been georectified, the &ldquo;Zones&rdquo; button allows you to display cost contours or clusters on a conventional (undistorted) map.</p>"
      break;
    case "selectsites":
      helpText = "<h3 class='contextHelpHead'>Select Sites</h3><p>This function allows you to limit your analysis to specific zones by drawing boxes on the map. However, if you wish to select or exclude a particular site, move your cursor to its location on the map and enter commands in the pop-up window.</p>"
      break;
    case "highres":
      helpText = "<h3 class='contextHelpHead'>High Resolution Routes</h3><p>Includes additional regional sites and routes that are secondary to the baseline network. While the known densities of sites and roads vary greatly among different parts of the Roman world, the baseline network is limited to the most important sites and routes in order to ensure consistent levels of coverage.</p><p>Relevant material will be added over time.</p>"
      break;
        case "browse":
      helpText = "<h3 class='contextHelpHead'>History</h3><p>Use this function to view your previous simulations.</p>"
      break;      
        case "networkcolor":
      helpText = "<p>This function colors the network routes according to cost and mode. For &ldquo;Expense&rdquo; and &ldquo;Speed,&rdquo; blue indicates the lowest cost and red the highest cost: blue routes are the fastest or cheapest, red ones the slowest or most expensive. &ldquo;Mode&rdquo; is the default setting that distinguishes between different types of routes: road, river, and coastal and open sea.</p>"
      break;
      case "cartogramon":
      helpText = "<h3 class='contextHelpHead'>Dynamic Distance Cartogram</h3><p>The cost cartogram function reconfigures the network by expressing the cost (in distance, time or expense) between the center and all other sites as distances: each unit of distance in the display corresponds to a unit of connectivity cost. For example, a site that is shown as being three times as far away from the center as another site is three times as costly (in terms of distance, time or expense) to reach from the center.</p>"
      break;
      case "pathcolor":
      helpText = "<h3 class='contextHelpHead'>Path Coloring</h3><p>Color paths based on mixing the colors of the starting point and destination site of that path.</p>"
      break;      
      case "":
      helpText = "<p></p>"
      break;      
  }
  d3.select("#infopopup").style("display", "block");
  d3.select("#infocontent").html(helpText);  
}

///Analytics
var _gaq = _gaq || [];

_gaq.push(['_setAccount', 'UA-30365192-1']);

_gaq.push(['_trackPageview']);

(function() {

var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;

ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';

var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);

})();  