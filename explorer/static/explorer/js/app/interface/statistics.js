/**
 * @statistics
 * Define the statistics widget.
 */

import { addClass, makeDiv, removeChildren, removeClass, wait } from "../generic/dom.js";
import { formatPercentage, uppercaseFirstLetter } from "../generic/parsing.js";
import Widget from "./widget.js";

class Statistics extends Widget {
    constructor(app, parent, params) {
        super(app, parent, params);
        this.type = 'statistics';
        
        this.container = makeDiv('statistics', 'sub-panel');
        this.parent.append(this.container);
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
        if (this.app.updater.taxonomy.children) {
            this.create();
            wait(this.params.interface.transition, () => {
                this.loaded();
                this.reveal();
                callback();
            });
        } else {
            this.loaded();
            callback();
        }
    }

    create() {
        // Initialize the chart dimensions
        const width = this.container.offsetWidth;
        const height = width;
        this.outer = height / 2;
        this.inner = this.outer * .5;
        this.radius = this.outer;

        let taxon = this.app.updater.getTaxon();
        let name;
        if (taxon.vernaculars.length > 0) { name = taxon.vernaculars[0]; }
        else { name = taxon.scientific; }
        this.current = { name: name, taxon: taxon.id, value: taxon.count, typesorting: taxon.typesorting }

        this.data = this.prepareData(this.app.updater.getLevel('children'));

        let color = this.color(this.data.length)

        // Add a color parameter to the parents objects.
        this.data.forEach((d, i) => d.color = color(i) );

        // Create a responsive svg.
        this.svg = d3.create("svg").attr("viewBox", [-width/2, -height/2, width, height]);
        // Add the svg to the dom
        this.chart.append(this.svg.node());

        // Set up the arc generator.
        this.arc = d3.arc().innerRadius(this.inner).outerRadius(this.outer);
        // Set up the pie slice generator without sorting => important when children
        // will be inserted in place of their parent.
        this.pie = d3.pie().value(d => d.value).sort(null);

        // Create the svg paths using the slice generator.
        this.slices = this.svg.append("g");
        this.parentgroup = this.svg.append("g");
        this.labels = this.svg.append("g");

        origin = this.slices.selectAll("path").data(this.pie(this.data), d => d.data.name);
        let self = this;

        // Add the path using this helper function
        this.parentcircle = this.parentgroup.append('circle')
            .attr('r', this.inner)
            .attr('fill', this.params.colors[this.current.typesorting])
            .attr("value", this.current.value)
            .style("cursor", "pointer")
            .on("click", (event, d) => {
                self.app.updater.updateFromStatistics(null, 'regress');
            });

        this.parentlabel = this.parentgroup.append("g");       
        this.wrapText(this.parentcircle, this.parentlabel, this.current.name);

        origin.enter()
            .append("path")
            // Fill the slice with the data color parameter.
            .attr("fill", d => d.data.color)
            .attr("d", this.arc)
            .attr("value", (d) => d.data.value)
            .style("cursor", "pointer")
            // Store the current slice value for the future transition animation.
            .each( function(d) { this._current = d })
            // Click event on the slice.
            .on("click", (event, d) => {
                self.app.updater.updateFromStatistics(d, 'grow');
            })
            .on("mouseenter", (event, d) => {
                // + '<br>' + formatPercentage(d.data.percentage);
                self.wrapText(self.parentcircle, self.parentlabel, d.data.name);
                self.parentcircle.transition().duration(200)
                    .attr('fill', self.params.colors[d.data.typesorting])
            })
            .on("mouseleave", (event, d) => {
                self.wrapText(self.parentcircle, self.parentlabel, self.current.name);
                self.parentcircle.transition().duration(200)
                    .attr('fill', self.params.colors[self.current.typesorting])
            })

        this.labels.selectAll()
            .data(this.pie(this.data))
            .enter()
                .append("text")
                .text(function(d) { if ((d.endAngle - d.startAngle) > 0.1) { return uppercaseFirstLetter(d.data.name); }})
                .attr("class", "slicelabels")
                .attr("text-anchor", "middle")
                .attr("font-size", '1.1rem')
                .attr("transform", (d) => {
                    let [x, y] = this.arc.centroid(d)
                    let start = d.startAngle * 180 / Math.PI;
                    let half = (d.endAngle - d.startAngle) / 2 * 180 / Math.PI
                    let angle = start + half;
                    if (angle > 180) { angle -= 180 }
                    return `translate(${x}, ${y}) rotate(${angle - 90})`
                })
                .attr("dy", "0.3rem")
                .attr("pointer-events", "none")
                .style('fill', 'white');

        d3.selectAll("svg .slicelabels").each(function(d, i) {
            let node = d3.select(this);
            let name = node.text();
            let length = node.node().getComputedTextLength();
            while (length > (self.outer - self.inner) * 0.9) {
                name = name.slice(0, name.length - 1);
                node.text(name + '...');
                length = node.node().getComputedTextLength();
            }
        });
    }

    animate(data, callback) {
        callback = callback || function () {};
        if (data === null) {
            this.loaded();
            callback();
        } else {
            let c = this.prepareData(data);
            // Sort the children by descending value.
            c.sort((a, b) => b.value - a.value);
            // Clone the array to retrieve values
            let clone = structuredClone(c);
            
            let color = this.color(c.length);
            c.forEach((d, i) => {
                // Assign the right color to the upcoming siblings.
                d.color = color(i);
                // Set their value to zero
                d.value = 0;
            });
            
            // Recreate the data.
            data = c.concat(this.data);

            // Regenerate the slices using the new data.
            let final = this.slices.selectAll("path").data(this.pie(data), d => d.data.name);
            let self = this;

            final.enter()
                .append("path")
                // Color them according to their color parameter.
                .attr("fill", d => d.data.color)
                .attr("value", (d) => d.data.value)
                .style("cursor", "pointer")
                // Store the new current value after adding the children for the future transition.
                .each( function(d) { this._current = d })
                // Click event on the slice.
                .on("click", function (event, d) {
                    self.app.updater.updateFromStatistics(d, 'grow');
                })
                .on("mouseenter", (event, d) => {
                    // + '<br>' + formatPercentage(d.data.percentage);
                    self.wrapText(self.parentcircle, self.parentlabel, d.data.name);
                    self.parentcircle.transition().duration(200)
                        .attr('fill', self.params.colors[d.data.typesorting])
               })
                .on("mouseleave", (event, d) => {
                    self.wrapText(self.parentcircle, self.parentlabel, self.current.name);
                    self.parentcircle.transition().duration(200)
                        .attr('fill', self.params.colors[self.current.typesorting])
                });
            
            // Remove the parent that has been replaced.
            this.slices.exit().remove();
        
            // Change the value of all other parents to zero.
            data.forEach((e, i) => {
                if (i < c.length) { e.value = clone[i].value; }
                else { e.value = 0; }
            });

            let labels = 0;
            this.labels.selectAll("text")
                .transition()
                .duration(250)
                .style("opacity", 0)
                .on("start", function() { labels++; })
                .on("end", function(d) {
                    d3.select(this).remove();
                    if(--labels === 0) {
                        self.labels.selectAll()
                            .data(self.pie(data))
                            .enter()
                                .append("text")
                                .text(function(d) {
                                    if ((d.endAngle - d.startAngle) > 0.1) { return uppercaseFirstLetter(d.data.name); }
                                })
                                .attr("class", "slicelabels")
                                .attr("text-anchor", "middle")
                                .attr("font-size", '1.1rem')
                                .attr("transform", (d) => {
                                    let [x, y] = self.arc.centroid(d)
                                    let start = d.startAngle * 180 / Math.PI;
                                    let half = (d.endAngle - d.startAngle) / 2 * 180 / Math.PI
                                    let angle = start + half;
                                    if (angle > 180) { angle -= 180 }
                                    return `translate(${x}, ${y}) rotate(${angle - 90})`
                                })
                                .attr("dy", "0.3rem")
                                .attr("pointer-events", "none")
                                .style('fill', 'white')
                                .style('opacity', 0);

                        d3.selectAll("svg .slicelabels").each(function(d, i) {
                            let node = d3.select(this);
                            let name = node.text();
                            let length = node.node().getComputedTextLength();
                            while (length > (self.outer - self.inner) * 0.9) {
                                name = name.slice(0, name.length - 1);
                                node.text(name + '...');
                                length = node.node().getComputedTextLength();
                            }
                        });

                        self.labels.selectAll("text")
                            .transition()
                            .duration(250)
                            .style('opacity', 1)
                            .on("end", function(d) {
                                if (d.data.value === 0) d3.select(this).remove();
                                self.labels.exit().remove();
                            })
                    }
                });

            this.parentlabel.transition()
                .duration(250)
                .style("opacity", 0)
                .on("end", function(d) {
                    self.parentgroup.transition(250)
                        .attr('fill', self.params.colors[self.current.typesorting])
                        .attr("value", self.current.value)

                    d3.select(this)
                        .transition(250)
                        .style("opacity", 1);

                    self.wrapText(self.parentcircle, d3.select(this), self.current.name);
                });

            // Calculate the slices using the new data with zeroed parents.
            final = this.slices.selectAll("path").data(this.pie(data), d => d.data.name);

            let transitions = 0;
            // Launch the animation.
            final.transition()
                .duration(500)
                .ease(d3.easeQuadOut)
                .attrTween("d", function(a) {
                    const i = d3.interpolate(this._current, a);
                    this._current = i(1);
                    return (t) => self.arc(i(t));
                })
                .on("start", function() { transitions++; })
                .on("end", function(d) {
                    if (d.data.value === 0) d3.select(this).remove();
                    // Checks if it's the last slice animation
                    if(--transitions === 0) {
                        // Remove the squished slices at the end of the animation.
                        self.data = data.slice(0, c.length);
                        self.slices.exit().remove();
                        addClass(self.mask, 'loaded');
                        self.loaded();
                        callback();
                    }
                })
        }
    }

    wrapText(container, label, text) {
        let ratio = 0.8;

        let bbox = container.node().getBBox()
        let words = uppercaseFirstLetter(text).split(/\s+/).reverse(),
            word,
            line = [],
            wordNumber = words.length,
            lineNumber = 0,
            lineHeight = 1.8,
            dy = .2,
            t = label.text(null)
                .append('text')
                .attr("text-anchor", "middle")
                .attr("font-size", '1.8rem')
                .attr("pointer-events", "none")
                .attr('dy', dy + 'rem')
                .style('fill', 'white');

        while (word = words.pop()) {
            line.push(word);
            t.text(line.join(' '));
            if (t.node().getComputedTextLength() > bbox.width * ratio) {
                if (wordNumber !== 1) {
                    line.pop();
                    t.text(line.join(' '));
                    line = [word];
                    t = label.append('text')
                        .attr("text-anchor", "middle")
                        .attr("font-size", '1.8rem')
                        .attr("pointer-events", "none")
                        .attr('dy', ++lineNumber * lineHeight + dy + 'rem')
                        .style('fill', 'white')
                        .text(word);
                }
            }
        }
        
        let labels = label.selectAll('text');
        let size = labels.size();
        if (size > 1) {
            labels.attr('dy', function(i, d) {
                let l = d3.select(this);
                let dyl = parseFloat(l.attr('dy'));
                return dyl - (size / 2) + 'rem';
            })
        }
    }

    color(length) {
        // Set up a color interpolation from red to red.
        const color1 = d3.color("hsl(0, 45%, 55%)");
        const color2 = d3.color("hsl(360, 45%, 55%)");
        let interpolation = d3.interpolateHslLong(color1, color2);
        // Set up the color generator based on the parents dataset.
        return d3.scaleOrdinal(d3.quantize(interpolation, length + 1));
    }

    prepare(entry) {
        let n;
        if (entry.vernaculars.length > 0) { n = entry.vernaculars[0]; }
        else { n = entry.scientific }
        return { name: n, taxon: entry.id, value: entry.count, percentage: entry.percentage, typesorting: entry.typesorting }
    }

    prepareData(data) {
        let result = [];
        for (let i = 0; i < (data.length); ++i) {
            result.push(this.prepare(data[i]));
        }
        return result;
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