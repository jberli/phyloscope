/**
 * @statistics
 * Define the statistics widget.
 */

import { addClass, addSVG, makeDiv, removeChildren, removeClass, wait } from "../generic/dom.js";
import { formatPercentage, uppercaseFirstLetter } from "../generic/parsing.js";
import Widget from "./widget.js";

class Statistics extends Widget {
    constructor(app, parent, params) {
        super(app, parent, params);
        this.type = 'statistics';
        
        this.container = makeDiv('statistics', 'sub-panel');
        this.parent.append(this.container);
        this.chart;

        // Flag if the current has no children
        this.children;

        // Mask and loader
        this.mask = makeDiv(null, 'statistics-mask mask');
        this.container.append(this.mask);

        this.chart = makeDiv(null, 'statistics-chart collapse');
        this.container.append(this.chart);

        this.helpcontainer = makeDiv(null, 'statistics-button-help-container button-help-container');
        this.help = makeDiv(null, 'button button-help');
        addSVG(this.help, new URL('/static/explorer/img/help.svg', import.meta.url));

        this.loader = makeDiv(null, 'loader-container');
        this.loadersymbol = makeDiv(null, 'loader');
        this.loader.append(this.loadersymbol);
        this.helpcontainer.append(this.help, this.loader);

        this.container.append(this.helpcontainer);
    }

    initialize(callback) {
        removeChildren(this.chart);
        this.create();
        wait(this.params.interface.transition, () => {
            this.loaded();
            this.reveal();
            callback();
        });
    }

    update(callback) {
        this.animate(this.app.updater.getLevel('children'), () => {
            this.loaded();
            callback();
        });
    }

    create() {
        // Initialize the chart dimensions
        const width = this.container.offsetWidth;
        const height = width;
        this.outer = height / 2;
        this.inner = this.outer * .5;
        this.radius = this.outer;
        this.children = true;

        this.minarc = 0.06;

        let taxon = this.app.updater.getTaxon();
        let name;
        if (taxon.vernaculars.length > 0) { name = taxon.vernaculars[0]; }
        else { name = taxon.scientific; }
        this.current = { name: name, taxon: taxon.id, value: taxon.count, typesorting: taxon.typesorting }

        let children = this.app.updater.getLevel('children');
        if (children === null) {
            this.children = false;
            this.data = [{name:'', taxon: 0, value: 1, percentage: 100, typesorting: null}]
        } else {
            this.data = this.prepareData(children);
        }

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

        this.currentactive = 0;

        origin = this.slices.selectAll("path").data(this.pie(this.data), d => d.data.taxon);
        let self = this;

        // Add the path using this helper function
        this.parentcircle = this.parentgroup.append('circle')
            .attr('r', this.inner)
            .attr('fill', 'currentColor')
            .attr('class', 'statistics-parent')
            .attr("value", this.current.value)
            .style("cursor", "pointer")
            .on("click", (event, d) => {
                if (!self.freezed) {
                    self.app.updater.updateFromStatistics(null, 'regress');
                }
            });

        this.parentlabel = this.parentgroup.append("g");
        let locale = this.app.params.languages.available[this.app.params.languages.current].locale; 
        this.wrapText(this.current.name, this.current.value.toLocaleString(locale));

        origin.enter()
            .append("path")
            // Fill the slice with the data color parameter.
            .attr("class", "pieslice")
            .attr("fill", (d) => {
                if (this.children) { return d.data.color; }
                else { return 'currentColor'; }
            })
            .attr("d", this.arc)
            .attr("value", (d) => d.data.value)
            .style("cursor", "pointer")
            // Store the current slice value for the future transition animation.
            .each( function(d) { this._current = d })
            // Click event on the slice.
            .on("click", (event, d) => {
                if (self.children && !self.freezed) {
                    self.app.updater.updateFromStatistics(d, 'grow');
                }
            })
            .on("mouseenter", function(event, d) {
                if (self.children) {
                    let obj = d3.select(this);
                    obj.attr("fill", d3.color(obj.attr("fill")).darker(.5));
                    if (!self.freezed) {
                        let locale = self.app.params.languages.available[self.app.params.languages.current].locale;
                        let stats = formatPercentage(d.data.percentage) + ' - ' + d.data.value.toLocaleString(locale);
                        self.wrapText(d.data.name, stats);
                        self.currentactive = self.app.taxonomy.children.getActive();
                        self.app.taxonomy.children.slideTo(d.index + 1);
                    }
                }
            })
            .on("mouseleave", function(event, d) {
                if (self.children) {
                    let obj = d3.select(this)
                    obj.attr("fill", d3.color(obj.attr("fill")).brighter(.5));
                    if (!self.freezed) {
                        let locale = self.app.params.languages.available[self.app.params.languages.current].locale;
                        self.wrapText(self.current.name, self.current.value.toLocaleString(locale));
                        self.app.taxonomy.children.slideTo(self.currentactive);
                    }
                }
            })

        this.labels.selectAll()
            .data(this.pie(this.data), d => d.data.taxon)
            .enter()
                .append("text")
                .text((d) => { if ((d.endAngle - d.startAngle) > this.minarc) { return uppercaseFirstLetter(d.data.name); }})
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
        let self = this;
        let c;
        if (data === null) {
            this.children = false;
            // Quick fix to avoid having the same id as the previous first children.
            let j;
            if (this.data[0].taxon !== 0) { j = 0; }
            else { j = -1; }
            c = [{name:'', taxon: j, value: 1, percentage: 100, typesorting: null}]
        } else {
            this.children = true;
            c = this.prepareData(data);
            // Sort the children by descending value.
            c.sort((a, b) => b.value - a.value);
            this.currentactive = this.app.updater.taxonomy.cindex + 1;
        }

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
        let updated = [...c, ...this.data]

        // Regenerate the slices using the new data.
        let final = this.slices.selectAll("path").data(this.pie(updated), d => d.data.taxon);
        
        final.enter()
            .append("path")
            // Color them according to their color parameter.
            .attr("fill", (d) => {
                if (this.children) { return d.data.color; }
                else { return 'currentColor'; }
            })
            .attr("value", (d) => d.data.value)
            .style("cursor", (d) => {
                if (this.children) { return 'pointer'; }
                else { return 'default'; }
            })
            // Store the new current value after adding the children for the future transition.
            .each( function(d) { this._current = d })
            // Click event on the slice.
            .on("click", function (event, d) {
                if (self.children && !self.freezed) {
                    self.app.updater.updateFromStatistics(d, 'grow');
                }
            })
            .on("mouseenter", function(event, d) {
                if (self.children) {
                    let obj = d3.select(this)
                    obj.attr("fill", d3.color(obj.attr("fill")).darker(.5));
                    if (!self.freezed) {
                        let locale = self.app.params.languages.available[self.app.params.languages.current].locale;
                        let stats = formatPercentage(d.data.percentage) + ' - ' + d.data.value.toLocaleString(locale);
                        self.wrapText(d.data.name, stats);
                        self.currentactive = self.app.taxonomy.children.getActive();
                        self.app.taxonomy.children.slideTo(d.index + 1);
                    }
                }
            })
            .on("mouseleave", function(event, d) {
                if (self.children) {
                    let obj = d3.select(this)
                    obj.attr("fill", d3.color(obj.attr("fill")).brighter(.5));
                    if (!self.freezed) {
                        let locale = self.app.params.languages.available[self.app.params.languages.current].locale;
                        self.wrapText(self.current.name, self.current.value.toLocaleString(locale));
                        self.app.taxonomy.children.slideTo(self.currentactive);
                    }
                }
            });

        // Change the value of all other parents to zero.
        updated.forEach((e, i) => {
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
                        .data(self.pie(updated), d => d.data.taxon)
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
                d3.select(this).transition(250).style("opacity", 1);
                let locale = self.app.params.languages.available[self.app.params.languages.current].locale; 
                self.wrapText(self.current.name, self.current.value.toLocaleString(locale));
            });

        // Calculate the slices using the new data with zeroed parents.
        final = this.slices.selectAll("path").data(this.pie(updated), d => d.data.taxon);

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
                    self.data = updated.slice(0, c.length);
                    self.slices.exit().remove();
                    addClass(self.mask, 'loaded');
                    self.loaded();
                    callback();
                }
        })
    }

    wrapText(text, stats) {
        let ratio = 0.8;
        let bbox = this.parentcircle.node().getBBox()

        let words = uppercaseFirstLetter(text).split(/\s+/).reverse(),
            word,
            line = [],
            wordNumber = words.length,
            lineNumber = 0,
            lineHeight = 1.8,
            dy = .2

        let t = this.parentlabel.text(null)
            .append('text')
            .attr("class", "statistics-parent-label")
            .attr('fill', 'currentColor')
            .attr("text-anchor", "middle")
            .attr("font-size", '1.8rem')
            .attr("pointer-events", "none")
            .attr('dy', dy + 'rem')

        while (word = words.pop()) {
            line.push(word);
            t.text(line.join(' '));
            if (t.node().getComputedTextLength() > bbox.width * ratio) {
                if (wordNumber !== 1) {
                    line.pop();
                    t.text(line.join(' '));
                    line = [word];
                    t = this.parentlabel.append('text')
                        .attr("class", "statistics-parent-label")
                        .attr('fill', 'currentColor')
                        .attr("text-anchor", "middle")
                        .attr("font-size", '1.8rem')
                        .attr("pointer-events", "none")
                        .attr('dy', ++lineNumber * lineHeight + dy + 'rem')
                        .text(word);
                }
            }
        }

        if (stats) {
            if (stats !== '1') {
                this.parentlabel.append('text')
                .attr("class", "statistics-parent-label")
                .attr('fill', 'currentColor')
                .attr("text-anchor", "middle")
                .attr("font-size", '1.1rem')
                .attr("pointer-events", "none")
                .attr('dy', ++lineNumber * lineHeight + dy + 'rem')
                .text(stats);
            }
        }
        
        let labels = this.parentlabel.selectAll('text');
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
        removeClass(this.loader, 'loaded');
    }

    /**
     * Hide the loader and allow interractions.
     */
    loaded() {
        addClass(this.mask, 'loaded');
        addClass(this.loader, 'loaded');
    }
}

export default Statistics;