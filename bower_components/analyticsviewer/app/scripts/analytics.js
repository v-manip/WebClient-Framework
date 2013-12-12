var analytics = {

	margin : {top: 20, right: 20, bottom: 90, left: 70},
	

	scatterPlot: function(arg){
		console.log("Scatter");
		/*###############################################################*/
		/*########################### D3JS Test #########################*/
		/*###############################################################*/

		//console.log(this.$el.width());
		var el = d3.select(arg.selector);
		$(arg.selector).empty();

		var width = $(arg.selector).width() - analytics.margin.left - analytics.margin.right,
			height = $(arg.selector).height() - analytics.margin.top - analytics.margin.bottom;

		
		var x = d3.scale.linear()
		    .range([0, width]);

		var y = d3.scale.linear()
		    .range([height, 0]);

		var color = d3.scale.category10();

		var xAxis = d3.svg.axis()
		    .scale(x)
		    .orient("bottom");

		var yAxis = d3.svg.axis()
		    .scale(y)
		    .orient("left");

		var svg = el.append("svg")
		    .attr("width", width +analytics.margin.left +analytics.margin.right)
		    .attr("height", height +analytics.margin.top +analytics.margin.bottom)
		  .append("g")
		    .attr("transform", "translate(" +analytics.margin.left + "," +analytics.margin.top + ")");

			
		d3.tsv("data.tsv", function(error, data) {
		  data.forEach(function(d) {
		    d.sepalLength = d.sepalLength * Math.random();
		    d.sepalWidth = d.sepalWidth * Math.random();
		  });

		//Dynamic, random dataset
		var numDataPoints = Math.round(10000 * Math.random());				//Number of dummy data points to create
		var xRange = 8.0;	//Max range of new x values
		var yRange = 8.0;	//Max range of new y values
		for (var i = 0; i < numDataPoints; i++) {					//Loop numDataPoints times
			var newNumber1 = Math.random() * xRange;	//New random number
			var newNumber2 = Math.random() * yRange;	//New random number
			var newArray = new Array();
			newArray["petalLength"] = newNumber1;
			newArray["petalWidth"] = newNumber2;
			newArray["sepalLength"] = newNumber1;
			newArray["sepalWidth"] = newNumber2;
			newArray["species"] = Math.random() > 0.5 ? "setosa" : Math.random() < 0.5 ? "versicolor" : "virginica";
			data.push(newArray);					//Add new number to array
		}
		  
		  
		  x.domain(d3.extent(data, function(d) { return d.sepalWidth; })).nice();
		  y.domain(d3.extent(data, function(d) { return d.sepalLength; })).nice();

		  svg.append("g")
		      .attr("class", "x axis")
		      .attr("transform", "translate(0," + height + ")")
		      .call(xAxis)
		    .append("text")
		      .attr("class", "label")
		      .attr("x", width)
		      .attr("y", -6)
		      .style("text-anchor", "end")
		      .text("Sepal Width (cm)");

		  svg.append("g")
		      .attr("class", "y axis")
		      .call(yAxis)
		    .append("text")
		      .attr("class", "label")
		      .attr("transform", "rotate(-90)")
		      .attr("y", 6)
		      .attr("dy", ".71em")
		      .style("text-anchor", "end")
		      .text("Sepal Length (cm)")

		  svg.selectAll(".dot")
		      .data(data)
		    .enter().append("circle")
		      .attr("class", "dot")
		      .attr("r", 3.5)
		      .attr("cx", function(d) { return x(d.sepalWidth); })
		      .attr("cy", function(d) { return y(d.sepalLength); })
		      .style("fill", function(d) { return color(d.species); });

		  var legend = svg.selectAll(".legend")
		      .data(color.domain())
		    .enter().append("g")
		      .attr("class", "legend")
		      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

		  legend.append("rect")
		      .attr("x", width - 18)
		      .attr("width", 18)
		      .attr("height", 18)
		      .style("fill", color);

		  legend.append("text")
		      .attr("x", width - 24)
		      .attr("y", 9)
		      .attr("dy", ".35em")
		      .style("text-anchor", "end")
		      .text(function(d) { return d; });

	      });
	},

	boxPlot: function(arg){
		console.log("boxPlot");
		
		var el = d3.select(arg.selector);
		$(arg.selector).empty();

    	var width = $(arg.selector).width() -analytics.margin.left - analytics.margin.right,
		    height = $(arg.selector).height() -analytics.margin.top - analytics.margin.bottom;

		var box_separation = 40;
		
		var min = Infinity,
		    max = -Infinity;

		

		d3.csv("FSC_filtered_new.csv", function(error, csv) {
		  var data = [];

		  csv.forEach(function(x) {
		    var e = Math.floor(x.Index - 1),
		        //r = Math.floor(x.Run - 1),
		        s = Math.floor(Math.round(Math.random() * 50.0) + x.Value * Math.random()),
		        d = data[e];
		    if (!d) d = data[e] = [s];
		    else d.push(s);
		    if (s > max) max = s;
		    if (s < min) min = s;
		  });

		  

	  	var chart = d3.box()
		    .whiskers(iqr(1.5))
		    .width(width/data.length - box_separation*2)
		    .height(height - analytics.margin.top - analytics.margin.bottom);

		chart.domain([min, max]);

		var svg = el.selectAll("svg")  
		    .append("g")
		      .data(data)
		    .enter().append("svg")
		      .attr("class", "box")
		      .attr("width", width/data.length)
		      .attr("height", height + analytics.margin.bottom + analytics.margin.top)
		    .append("g")
		      .attr("transform", "translate(" + box_separation + "," + analytics.margin.top + ")")
		      .call(chart);
		});

	},

	hovPlot: function(arg){
		console.log("hovPlot");
	},


	parallelsPlot: function(arg){
		console.log("parallelsPlot");
		var el = d3.select(arg.selector);
		$(arg.selector).empty();
		
		
		var species = ["setosa", "versicolor", "virginica"],
		    traits = ["sepal length", "petal length", "sepal width", "petal width"];

    	var	width = $(arg.selector).width() - analytics.margin.left - analytics.margin.right,
			height = $(arg.selector).height() - analytics.margin.top - analytics.margin.bottom;

		console.log(width,height);

		var x = d3.scale.ordinal().domain(traits).rangePoints([0, width]),
		    y = {};

		var line = d3.svg.line(),
		    axis = d3.svg.axis().orient("left"),
		    foreground;

		var svg = el.append("svg:svg")
			.attr("class", "svg")
		  .append("svg:g")
		    .attr("transform", "translate(" + analytics.margin.left + "," + analytics.margin.top + ")");


		d3.csv("iris.csv", function(flowers) {

		  // Create a scale and brush for each trait.
		  traits.forEach(function(d) {
		    // Coerce values to numbers.
		    //flowers.forEach(function(p) { p[d] = +p[d]* Math.random(); });

		    y[d] = d3.scale.linear()
		        .domain(d3.extent(flowers, function(p) { return p[d]; }))
		        .range([height, 0]);

		    y[d].brush = d3.svg.brush()
		        .y(y[d])
		        .on("brush", brush);
		 });

		  // Add a legend.
		  var legend = svg.selectAll("g.legend")
		      .data(species)
		    .enter().append("svg:g")
		      .attr("class", "legend")
		      .attr("transform", function(d, i) { return "translate(0," + (i * 20 + 584) + ")"; });

		  legend.append("svg:line")
		      .attr("class", String)
		      .attr("x2", 8);

		  legend.append("svg:text")
		      .attr("x", 12)
		      .attr("dy", ".31em")
		      .text(function(d) { return "Iris " + d; });

		  // Add foreground lines.
		  foreground = svg.append("svg:g")
		      .attr("class", "foreground")
		    .selectAll("path")
		      .data(flowers)
		    .enter().append("svg:path")
		      .attr("d", path)
		      .attr("class", function(d) { return d.species; });

		  // Add a group element for each trait.
		  var g = svg.selectAll(".trait")
		      .data(traits)
		    .enter().append("svg:g")
		      .attr("class", "trait")
		      .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
		     /* .call(d3.behavior.drag()
		      .origin(function(d) { return {x: x(d)}; })
		      .on("dragstart", dragstart)
		      .on("drag", drag)
		      .on("dragend", dragend))*/;

		  // Add an axis and title.
		  g.append("svg:g")
		      .attr("class", "axis")
		      .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
		    .append("svg:text")
		      .attr("text-anchor", "middle")
		      .attr("y", -9)
		      .text(String);

		  // Add a brush for each axis.
		  g.append("svg:g")
		      .attr("class", "brush")
		      .each(function(d) { d3.select(this).call(y[d].brush); })
		    .selectAll("rect")
		      .attr("x", -8)
		      .attr("width", 16);

		  /*function dragstart(d) {
		    i = traits.indexOf(d);
		  }

		  function drag(d) {
		    x.range()[i] = d3.event.x;
		    traits.sort(function(a, b) { return x(a) - x(b); });
		    g.attr("transform", function(d) { return "translate(" + x(d) + ")"; });
		    foreground.attr("d", path);
		  }

		  function dragend(d) {
		    x.domain(traits).rangePoints([0, w]);
		    var t = d3.transition().duration(500);
		    t.selectAll(".trait").attr("transform", function(d) { return "translate(" + x(d) + ")"; });
		    t.selectAll(".foreground path").attr("d", path);
		  }*/
		});

		// Returns the path for a given data point.
		function path(d) {
		  return line(traits.map(function(p) { return [x(p), y[p](d[p])]; }));
		}

		// Handles a brush event, toggling the display of foreground lines.
		function brush() {
		  var actives = traits.filter(function(p) { return !y[p].brush.empty(); }),
		      extents = actives.map(function(p) { return y[p].brush.extent(); });
		  foreground.classed("fade", function(d) {
		    return !actives.every(function(p, i) {
		      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
		    });
		  });
		}

	},

}