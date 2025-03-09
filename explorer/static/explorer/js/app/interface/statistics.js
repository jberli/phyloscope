/**
 * @statistics
 * Define the statistics widget.
 */

import { ajaxGet } from "../generic/ajax.js";
import { addClass, makeDiv, removeChildren, removeClass, wait } from "../generic/dom.js";
import Widget from "./widget.js";

class Statistics extends Widget {
    constructor(app, params) {
        super(app, params);
        this.type = 'statistics';
        
        this.container = makeDiv('statistics', 'sub-panel');
        this.app.third.append(this.container);
        this.chart;

        // Mask and loader
        this.mask = makeDiv(null, 'statistics-mask mask');
        this.loader = makeDiv(null, 'statistics-loader loader');
        this.mask.append(this.loader)
        this.container.append(this.mask);

        this.chart = makeDiv(null, 'statistics-chart collapse');
        this.container.append(this.chart);
    }

    update(callback) {
        removeChildren(this.chart);
        this.createChart();
        wait(this.params.interface.transition, () => {
            this.loaded();
            this.reveal();
        });
        callback();
    }

    grow() {

    }

    regress() {

    }
    
    createChart() {
        // Initialize the chart dimensions
        const width = this.container.offsetWidth;
        const height = width;
        const outer = height / 2;
        const inner = outer * .5;

        let taxon = this.app.updater.getTaxon();
        let name;
        if (taxon.vernaculars.length > 0) { name = taxon.vernaculars[0]; }
        else { name = taxon.scientific; }
        let current = { name: name, taxon: taxon.id, value: taxon.count, typesorting: taxon.typesorting }

        var children = this.prepare(this.app.updater.getLevel('children'));

        // Set up a color interpolation from red to red.
        const color1 = d3.color("hsl(0, 45%, 55%)");
        const color2 = d3.color("hsl(360, 45%, 55%)");
        const interpolation = d3.interpolateHslLong(color1, color2);
        // Set up the color generator based on the parents dataset.
        var color = d3.scaleOrdinal(d3.quantize(interpolation, children.length + 1));

        // Sort the parents by descending value.
        children.sort((a, b) => b.value - a.value);
        // Add a color parameter to the parents objects.
        children.forEach((d, i) => d.color = color(i) );

        // Create a responsive svg.
        var svg = d3.create("svg").attr("viewBox", [-width/2, -height/2, width, height]);
        // Set up the arc generator.
        var arc = d3.arc().innerRadius(inner).outerRadius(outer);
        // Set up the pie slice generator without sorting => important when children
        // will be inserted in place of their parent.
        const pie = d3.pie().value(d => d.value).sort(null);

        // Create the svg paths using the slice generator.
        var path = svg.selectAll("path").data(pie(children), d => d.data.name);
        let self = this;

        // Add the path using this helper function
        var parent = svg.append('circle')
            .attr('r', inner)
            .attr('fill', 'currentColor')
            .attr("value", current.value)
            .style("cursor", "pointer")
            .on("click", (event, d) => {
                getParent(d, (parent) => { current = parent; });
            });

        path.enter()
            .append("path")
            // Fill the slice with the data color parameter.
            .attr("fill", d => d.data.color)
            .attr("d", arc)
            .attr("value", d => d.data.value)
            .style("cursor", "pointer")
            // Store the current slice value for the future transition animation.
            .each( function(d) { this._current = d })
            // Click event on the slice.
            .on("click", (event, d) => { 
                getchildren(d, () => { current = d.data; });
            });

        this.chart.append(svg.node());

        function getParent(d, callback) {
            removeClass(self.mask, 'loaded');
            ajaxGet('/parents/' + self.params.languages.current + '/' + current.taxon, (r) => {
                if (r.parents === null) {
                    addClass(self.mask, 'loaded');
                    callback();
                } else {
                    let parent = r.parents[r.pindex]
                    let name;
                    if (parent.vernaculars.length > 0) { name = parent.vernaculars[0]; }
                    else { name = parent.scientific; }
                    let current = { name: name, taxon: parent.id, value: parent.count, typesorting: parent.typesorting }
                    callback(current);
                }
            });
        }

        function getchildren(d, callback) {
            removeClass(self.mask, 'loaded');
            ajaxGet('/children/' + self.params.languages.current + '/' + d.data.taxon, (r) => {
                if (r.children === null) {
                    addClass(self.mask, 'loaded');
                    callback();
                } else {
                    let c = self.prepare(r.children);
                    // Sort the children by descending value.
                    c.sort((a, b) => b.value - a.value);
                    // Recalculate the color scale and assign the right value to the children.
                    color = d3.scaleOrdinal(d3.quantize(interpolation, c.length + 1));
                    c.forEach((d, i) => d.color = color(i) );
                    
                    // Recreate the data by inserting the children in place of the parent.
                    var data = children.slice(0, d.index).concat(c).concat(children.slice(d.index + 1));
                    children = data;
                    // Launch the function to slice the parent in its children.
                    subslice(children, d.index, d.index + c.length, callback);
                }
            });
        }

        /*
        * This function regenerate the pie chart and slice the clicked parent
        * into its children.
        */
        function subslice(data, start, end, callback) {
            // Regenerate the slices using the new data.
            var sectors = svg.selectAll("path").data(pie(data), d => d.data.name)
            sectors.enter()
                .append("path")
                // Color them according to their color parameter.
                .attr("fill", d => d.data.color)
                .attr("value", d => d.data.value)
                .style("cursor", "pointer")
                // Store the new current value after adding the children for the future transition.
                .each( function(d) { this._current = d })
                // Click event on the slice.
                .on("click", function (event, d) {
                    getchildren(d, () => { current = d.data; });
                });
            
                // Remove the parent that has been replaced.
            sectors.exit().remove();
        
            // Change the value of all other parents to zero.
            data.forEach((child, i) => { if (i < start || i >= end) { child.value = 0; } });
            // Launch the animation
            animate(data, callback);
        }

        /*
        * This function animates the pie chart to squich the parents and expand the children.
        */
        function animate(data, callback) {
            // Calculate the slices using the new data with zeroed parents.
            var sectors = svg.selectAll("path").data(pie(data), d => d.data.name);
            
            // Launch the animation.
            sectors.transition()
                .duration(500)
                .ease(d3.easeQuadOut)
                .attrTween("d", tween)
                .on("end", function(d) {
                    // Remove the squished parent at the end of the animation.
                    if (d.data.value === 0) d3.select(this).remove();
                    addClass(self.mask, 'loaded');
                    callback();
                });
        }

        /*
        * The tween animation function.
        */
        function tween(a) { 
            const i = d3.interpolate(this._current, a);
            this._current = i(1);
            return (t) => arc(i(t));
        }
    }

    prepare(data) {
        let children = [];
        for (let i = 0; i < (data.length); ++i) {
            let current = data[i];
            let n;
            if (current.vernaculars.length > 0) { n = current.vernaculars[0]; }
            else { n = current.scientific }
            children.push({ name: n, taxon: current.id, value: current.count, typesorting: current.typesorting })
        }
        return children;
    }

    collapse() {
        addClass(this.chart, 'collapse');
    }

    reveal() {
        removeClass(this.chart, 'collapse');
    }

    /**
     * Display the loader on the widget and block interractions.
     */
    loading() {
        removeClass(this.mask, 'loaded');
    }

    /**
     * Hide the loader and allow interractions.
     */
    loaded() {
        addClass(this.mask, 'loaded');
    }
}

export default Statistics;