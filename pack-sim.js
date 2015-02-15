// 1 foot == 10 "units"
var xo = 20;
var yo = 20;
var inner_rad = 125;
var outer_rad = 265;
var chord_len = 70 + (0.5 / 12 * 10); // 7' 1/2"
var centre_offset = 10;

var middle_cx = xo + outer_rad + 175;
var middle_cy = yo + outer_rad;

var inner_cx1 = xo + outer_rad;
var inner_cy1 = yo + outer_rad;
var inner_cx2 = inner_cx1 + (175 * 2);
var inner_cy2 = inner_cy1;

var outer_cx1 = inner_cx1;
var outer_cy1 = inner_cy1 + 10; // one foot down
var outer_cx2 = inner_cx2;
var outer_cy2 = inner_cy1 - 10; // one foot up

var track_min_width = outer_rad - inner_rad - centre_offset;
var track_max_width = outer_rad - inner_rad + centre_offset;

var player_radius = ((track_min_width / 4) * 0.5) * 0.85;
var blocker_count = 8;
var blockers_per_team = blocker_count / 2;
var players = [];

var innerPath = null;
var outerPath = null;

var max_pack_distance = 100;

var start = function () {
    this.ox = this.attr("cx");
    this.oy = this.attr("cy");
    this.animate({r: player_radius, opacity: .25}, 500, ">");
},
move = function (dx, dy) {
    this.attr({cx: this.ox + dx, cy: this.oy + dy});
},
up = function () {
    this.animate({r: player_radius, opacity: .5}, 500, ">");
    update_bounds(players);
    define_pack(players);
};

function make_player(R, x, y, num, colour, team) {
    var player = R.circle(x, y + track_min_width / blockers_per_team * num, player_radius);
    player.attr({
        fill: colour,
        stroke: "red",
        "stroke-width": 2,
        opacity: .5});
    player.data("team", team);
    player.data("label", team + num);
    player.data("in_bounds", true);
    // player.hover(function hoverIn() {

    //   this.animate({
    //     r: max_pack_distance,
    //     opacity: 0.1
    //   }, 500);
    // }, function hoverOut() {
    //   this.animate({
    //     r: player_radius,
    //     opacity: 0.5
    //   }, 500);
    // });
    return player;
}
function load() {
    var R = Raphael(0, 0, "100%", "100%");
    var st = R.set();

    draw_track(R);

    // TODO: express these in term of contstants above.
    var jam_line_offset_ax = 615;
    var jam_line_offset_bx = 615 - player_radius - 10;
    var jam_line_offset_y = 427;

    for (var i = 0; i < blockers_per_team; i++) {
        //var track_part = track_min_width / blockers_per_team * i;
        var a = make_player(R, jam_line_offset_ax, jam_line_offset_y,
                            i, "hsb(.3, 1, 1)", "a");

        var b = make_player(R, jam_line_offset_bx, jam_line_offset_y,
                            i, "hsb(.8, 1, 1)", "b");

        st.push(a, b);
        players.push(a);
        players.push(b);
    }

    st.drag(move, start, up);
}

function M(x, y) {
    return g_to("M", x, y);
}

function L(x, y) {
    return g_to("L", x, y);
}

function g_to(t, x, y) {
    return [t, x, y].join(" ");
}

// round arc
function A(rad, x, y) {
    return "A" + rad + "," + rad + " 0 0,0 " + x + "," + y;
}

function rad2deg(rads) {
    return rads * (180 / Math.PI);
}

function deg2rad(degs) {
    return degs * (Math.PI / 180);
}

function distance(p1, p2) {
    // TODO: this should be calculated based on a line parallel to the inside
    //       track boundary. For now, straight-line distance is close enough.
    var dx = p1.attr("cx") - p2.attr("cx");
    var dy = p1.attr("cy") - p2.attr("cy");
    return Math.sqrt(dx * dx + dy * dy);
}

function update_bounds(players) {
    for (var i = 0; i < players.length; i++) {
        // Check if this player is in bounds, straddling, or out of bounds.

    }
}

function define_pack(players) {
    console.log("Define pack!");
    var potential_packs = [];

    for (var i = 0; i < blocker_count - 1; i++) {
        for (var j = i + 1; j < blocker_count; j++) {
            var d = distance(players[i], players[j]);
            console.log("Distance from " + players[i].data("label") + " to " + players[j].data("label") + " is " + d);
        }
    }

    //players.forEach(function(s){ console.log("Found " + s.data("label") + " at [" + s.attr("cx") + "," + s.attr("cy") + "]"); });
}

function draw_track(R) {
    // See http://wftda.com/rules/wftda-rules-appendix-a-track-design.pdf
    var inner_arc1 = M(inner_cx1, inner_cy1 - inner_rad) + " " +
                     A(inner_rad, inner_cx1, inner_cy1 + inner_rad);
    var inner_bottom_line = L(inner_cx2, inner_cy2 + inner_rad);
    var inner_arc2 = M(inner_cx2, inner_cy2 + inner_rad) + " " +
                     A(inner_rad, inner_cx2, inner_cy2 - inner_rad);
    var inner_top_line = L(inner_cx1, inner_cy1 - inner_rad);
    var inner_boundary = [inner_arc1, inner_bottom_line, inner_arc2, inner_top_line].join(" ");
    innerPath = R.path(inner_boundary).attr({stroke: "#000"});


    var outer_arc1 = M(outer_cx1, outer_cy1 - outer_rad) + " " +
                    A(outer_rad, outer_cx1, outer_cy1 + outer_rad);
    var outer_bottom_line = L(outer_cx2, outer_cy2 + outer_rad);
    var outer_arc2 = M(outer_cx2, outer_cy2 + outer_rad) + " " +
                     A(outer_rad, outer_cx2, outer_cy2 - outer_rad);
    var outer_top_line = L(outer_cx1, outer_cy1 - outer_rad);
    var outer_boundary = [outer_arc1, outer_bottom_line, outer_arc2, outer_top_line].join(" ");
    outerPath = R.path(outer_boundary).attr({stroke: "#000"});

    // Centre dots:
    // R.circle(inner_cx1,inner_cy1,4).attr({fill: "#fff"});
    // R.circle(inner_cx2,inner_cy2,4).attr({fill: "#fff"});
    // R.circle(outer_cx1,outer_cy1,4).attr({fill: "#bbb"});
    // R.circle(outer_cx2,outer_cy2,4).attr({fill: "#bbb"});
    // R.circle(middle_cx,middle_cy,4).attr({fill: "#f55"});

    // Draw 10' lines:
    // Pivot line (1):
    R.path([M(inner_cx2, inner_cy2 + inner_rad + 1),
            L(inner_cx2, inner_cy2 + inner_rad + 130 - 1)
           ].join(" ")).attr({stroke: "#c00", "stroke-width": 3});
    // (2)
    R.path([M(inner_cx2 - 100, inner_cy2 + inner_rad + 20),
            L(inner_cx2 - 100, inner_cy2 + inner_rad + 130 - 20)
           ].join(" ")).attr({stroke: "#000"});
    // (3)
    R.path([M(inner_cx2 - 200, inner_cy2 + inner_rad + 25),
            L(inner_cx2 - 200, inner_cy2 + inner_rad + 130 - 20)
           ].join(" ")).attr({stroke: "#000"});
    // Jammer line (4):
    R.path([M(inner_cx2 - 300, inner_cy2 + inner_rad + 1),
            L(inner_cx2 - 300, inner_cy2 + inner_rad + 130 - 1 + 17)
           ].join(" ")).attr({stroke: "#00c", "stroke-width": 3});

    // second straightaway:
    // (5)
    R.path([M(inner_cx1, inner_cy1 - inner_rad - 20),
            L(inner_cx1, inner_cy1 - inner_rad - 130 + 20)
           ].join(" ")).attr({stroke: "#000"});
    // (6)
    R.path([M(inner_cx1 + 100, inner_cy1 - inner_rad - 25),
            L(inner_cx1 + 100, inner_cy1 - inner_rad - 130 + 20)
           ].join(" ")).attr({stroke: "#000"});
    // (7)
    R.path([M(inner_cx1 + 200, inner_cy1 - inner_rad - 25),
            L(inner_cx1 + 200, inner_cy1 - inner_rad - 130 + 20)
           ].join(" ")).attr({stroke: "#000"});
    // (8)
    R.path([M(inner_cx1 + 300, inner_cy1 - inner_rad - 25),
            L(inner_cx1 + 300, inner_cy1 - inner_rad - 130 + 20)
           ].join(" ")).attr({stroke: "#000"});

    // inner_angle in radians
    var inner_angle = 2 * Math.asin(chord_len / (2 * inner_rad));
    console.log("central angle = " + rad2deg(inner_angle));

    // (9) to (13)
    for (var i = 1; i <= 5; i++) {
        var inner_h = Math.sin(inner_angle * i) * (inner_rad + 20);
        var inner_v = Math.cos(inner_angle * i) * (inner_rad + 20);
        // R.circle(inner_cx2 + inner_h, inner_cy2 + inner_v, 4).attr({fill: "#fff"});

        // The outer points are estimates, but close enough since the
        // line doesn't go all the way to the edge. This is because the outer
        // edge of the track is offset from the inner edge and I'm too lazy to
        // do the math.
        var outer_h = Math.sin(inner_angle * i) * (outer_rad - 20);
        var outer_v = Math.cos(inner_angle * i) * (outer_rad - 20);
        // R.circle(inner_cx2 + outer_h, inner_cy2 + outer_v, 4).attr({fill: "#fff"});

        // (9) to (13): offset up and to the right
        R.path([M(inner_cx2 + inner_h, inner_cy2 + inner_v),
                L(inner_cx2 + outer_h, inner_cy2 + outer_v)
               ].join(" ")).attr({stroke: "#000"});

        // (14) to (18): offset down and to the left
        R.path([M(inner_cx1 - inner_h, inner_cy1 - inner_v),
                L(inner_cx1 - outer_h, inner_cy2 - outer_v)
               ].join(" ")).attr({stroke: "#000"});
    }
}
