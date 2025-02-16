/**
 * @statistics
 * Define the statistics widget.
 */

import { addClass, makeDiv, removeChildren, removeClass, wait } from "../generic/dom.js";

class Statistics {
    constructor(app, params) {
        this.app = app;
        this.params = params;
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

    update() {
        removeChildren(this.chart);

        let taxonomy = this.app.params.taxonomy;
        let children = taxonomy.children;
        let taxon = taxonomy.siblings[taxonomy.tindex];

        let name;
        if (taxon.vernaculars.length > 0) { name = taxon.vernaculars[0]; }
        else { name = taxon.scientific; }

        let data = {
            name: name,
            typesorting: taxon.typesorting,
            children: []
        }

        for (let i = 0; i < (children.length); ++i) {
            let current = children[i];
            let n;
            if (current.vernaculars.length > 0) { n = current.vernaculars[0]; }
            else { n = current.scientific }
            data.children.push({ name: n, value: current.count, typesorting: current.typesorting })
        }

        // Specify the chart’s dimensions.
        const width = this.container.offsetWidth;
        const height = width;
        const radius = width / 4;

        const color1 = d3.color("hsl(0, 45%, 55%)");
        const color2 = d3.color("hsl(360, 45%, 55%)");
        const interpolation = d3.interpolateHslLong(color1, color2);

        // Create the color scale.
        const color = d3.scaleOrdinal(d3.quantize(interpolation, data.children.length + 1));

        // Compute the layout.
        const hierarchy = d3.hierarchy(data)
            // Get the value sum.
            .sum(d => d.value)
            // Sort the data by highest values.
            .sort((a, b) => b.value - a.value);
        
        // Create the root partition
        const root = d3.partition()
            // Set the size of the partition depending on the depth of the data.
            .size([2 * Math.PI, hierarchy.height + 1])
            (hierarchy);
        // Set up the layout for each element.
        root.each(d => d.current = d);

        // Create the arc generator.
        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            // Padding between arcs
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius * 1.5)
            // Inner and outer radius of the burst.
            .innerRadius(d => d.y0 * radius)
            .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1))

        // Create the SVG container.
        const svg = d3.create("svg").attr("viewBox", [-width / 2, -height / 2, width, width])

        // Append the arcs.
        const path = svg.append("g")
            // Select all paths, i.e. slices of the disk.
            .selectAll("path")
            // Get the data for all children of the wanted depth.
            .data(root.descendants().slice(1))
            // Append new elements given the provided data.
            .join("path")
                // Fill using the proper range color and set the opacity depending on the visiblity.
                .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
                .attr("fill-opacity", d => arcVisible(d.current) ? 1 : 0)
                // Remove pointer events.
                .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
                .attr("count", d => d.data.value)
                .attr("name", d => d.data.name)
                // Generate the actual arc.
                .attr("d", d => arc(d.current));

        // Make them clickable.
        path.style("cursor", "pointer").on("click", clicked);

        // Append a title to each arc as the name of the group.
        // path.append("title").text(d => `${d.data.name}`);

        // Create the label for each group.
        const label = svg.append("g")
            .attr("pointer-events", "none")
            // Anchor the text in the middle for the rotation.
            .attr("text-anchor", "middle")
            // Prevent user select.
            .style("user-select", "none")
            // Select all texts.
            .selectAll("text")
            // Append the data.
            .data(root.descendants().slice(1))
            // Append new text given the provided data.
            .join("text")
                // Shift in the y dimension.
                .attr("dy", "0.35em")
                // Display the label if the label should be visible.
                .attr("fill-opacity", d => +labelVisible(d.current))
                // Apply a rotation to fit the arc.
                .attr("transform", d => labelTransform(d.current))
                // Set the color to white.
                .style('fill', 'white')
                // Add the text value as the name of the group.
                .text(d => d.data.name);

        // Create a circle in the middle to click.
        const parent = svg.append("circle")
            // Bind root data.
            .datum(root)
            // Set the radius.
            .attr("r", radius)
            // No fill, activate pointer-events.
            // .attr("fill", this.params.colors[root.data.typesorting])
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .style("cursor", "pointer")
            // Activate the click event.
            .on("click", clicked)

        const parentlabel = svg.append("text")
            .attr("text-anchor", "middle")
            // .style("fill", this.params.colors[root.data.typesorting])
            .style('fill', 'white')
            .style('font-size', '1rem')
            .text(root.data.name);

        this.chart.append(svg.node());
        this.reveal();

        wait(this.params.interface.transition, () => {
            this.loaded();
        });

        path.on('mouseenter', (e) => {

        })

        path.on('mouseleave', (e) => {

        })

        // Handle zoom on click.
        function clicked(event, p) {
            parent.datum(p.parent || root);

            root.each(d => d.target = {
                x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                y0: Math.max(0, d.y0 - p.depth),
                y1: Math.max(0, d.y1 - p.depth)
            });

            const t = svg.transition().duration(event.altKey ? 7500 : 750);

            // Transition the data on all arcs, even the ones that aren’t visible,
            // so that if this transition is interrupted, entering arcs will start
            // the next transition from the desired position.
            path.transition(t)
                .tween("data", d => {
                    const i = d3.interpolate(d.current, d.target);
                    return t => d.current = i(t);
                })
                .filter(function(d) {
                return +this.getAttribute("fill-opacity") || arcVisible(d.target);
                })
                .attr("fill-opacity", d => arcVisible(d.target) ? 1 : 0)
                .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none") 

                .attrTween("d", d => () => arc(d.current));

            label.filter(function(d) {
                return +this.getAttribute("fill-opacity") || labelVisible(d.target);
                }).transition(t)
                .attr("fill-opacity", d => +labelVisible(d.target))
                .attrTween("transform", d => () => labelTransform(d.current));
        }

        function arcVisible(d) {
            return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
        }

        function labelVisible(d) {
            return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.08;
        }

        function labelTransform(d) {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2 * radius;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        }
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
        this.collapse();
    }

    /**
     * Hide the loader and allow interractions.
     */
    loaded() {
        addClass(this.mask, 'loaded');
        this.reveal();
    }
}

export default Statistics;