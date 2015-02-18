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

var inner_boundary = null;
var outer_boundary = null;

var no_pack_message = null;

var max_pack_distance = 100;

var start = function () {
    this.ox = this.attr("cx");
    this.oy = this.attr("cy");
    this.animate({r: player_radius}, 500, ">");
},
move = function (dx, dy) {
    this.attr({cx: this.ox + dx, cy: this.oy + dy});
},
up = function () {
    this.animate({r: player_radius}, 500, ">");
    // TODO: just update the bounds of the player being moved.
    update_bounds(players);
    define_pack(players);
    distance2(players[0], players[1]);
};

function make_player(R, x, y, num, colour, team) {
    var player = R.circle(x, y + track_min_width / blockers_per_team * num, player_radius);
    player.attr({fill: colour, "stroke-width": 2});
    player.data("team", team);
    player.data("label", team + (num + 1));
    in_bounds(player);
    return player;
}
function load() {
    var R = Raphael(0, 0, "100%", "100%");
    var st = R.set();

    draw_track(R);

    no_pack_message = R.text(middle_cx, middle_cy, "Move the blockers around to see how it affects the pack.");
    no_pack_message.attr({"font-family": "helvetica", "font-weight": "bold", "font-size": "15px"});

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

function distance2(p1, p2) {
    var x_left = inner_cx1;
    var x_right = inner_cx2;
    var y_mid = inner_cy1;

    var p1x = p1.attr("cx");
    var p1y = p1.attr("cy");
    var p2x = p2.attr("cx");
    var p2y = p2.attr("cy");

    var p1top = p1y < y_mid;
    var p2top = p2y < y_mid;

    var p1left  = p1x <= x_left;
    var p1right = p1x >= x_right;
    var p1mid = !p1left && !p1right;

    var p2left  = p2x <= x_left;
    var p2right = p2x >= x_right;
    var p2mid = !p2left && !p2right;

    // Easy cases:
    // Both on a straightaway
    if (p1mid && p2mid) {
        if (p1top == p2top) {
            // Same straightaway. Distance is just diff in x.
            no_pack_message.attr({"text": "Distance: " + Math.abs(p1x - p2x)});
            return Math.abs(p1x - p2x);
        } else {
            // Different straightaway. Distance is <large>
            no_pack_message.attr({"text": "Distance: 1000 + " + Math.abs(p1x - p2x)});
            return 1000 + Math.abs(p1x - p2x);
        }
    }

    // Different turns
    if (!p1mid && !p2mid && p1left != p2left) {
        // Both on turns, but not the same turn. Distance is <large>
        no_pack_message.attr({"text": "Distance: 1000 + " + Math.abs(p1x - p2x)});
        return 1000 + Math.abs(p1x - p2x);
    }

    // One player is on a straightaway:
    if (p1mid) {
        if (p1top != p2top) {
            // p2 is past the apex while p1 is still on the straightaway.
            // Distance is <large>
            no_pack_message.attr({"text": "p1 straightaway, p2 past apex. Distance: 1000 + " + Math.abs(p1x - p2x)});
            return 1000 + Math.abs(p1x - p2x);
        }

        // p1 and p2 are on the same (vertical) half of the track
        no_pack_message.attr({"text": "TODO: p1 is on a straightaway"});
    } else if (p2mid) {
        if (p1top != p2top) {
            // p2 is past the apex while p1 is still on the straightaway.
            // Distance is <large>
            no_pack_message.attr({"text": "p1 straightaway, p2 past apex. Distance: 1000 + " + Math.abs(p1x - p2x)});
            return 1000 + Math.abs(p1x - p2x);
        }

        // p1 and p2 are on the same (vertical) half of the track
        no_pack_message.attr({"text": "TODO: p2 is on a straightaway"});
    } else {
        no_pack_message.attr({"text": "TODO: Both players in the same turn"});
    }

    var p1xend = null;
    if (p1x <= x_left) {
        p1xend = x_left;
    } else if (p1x >= x_right) {
        p1xend = x_right;
    } else {
        p1xend = p1x;
    }
    //var c = p1.paper.path(M(p1x, p1y) + " " + L(p1xend, y_mid)).attr({stroke: "black"});

    // TODO: make a line perpendicular:
    var slope = (y_mid - p1y) / (p1xend - p1x);
    var perp = 1 / slope;

    var p2xend = null;
    if (p2x <= x_left) {
        p2xend = x_left;
    } else if (p2x >= x_right) {
        p2xend = x_right;
    } else {
        p2xend = p2x;
    }
    //var c = p2.paper.path(M(p2x, p2y) + " " + L(p2xend, y_mid)).attr({stroke: "white"});


    // TODO: this should be calculated based on a line parallel to the inside
    //       track boundary. For now, straight-line distance is close enough.
    var dx = p1.attr("cx") - p2.attr("cx");
    var dy = p1.attr("cy") - p2.attr("cy");
    return Math.sqrt(dx * dx + dy * dy);
}

function distance(p1, p2) {
    // TODO: this should be calculated based on a line parallel to the inside
    //       track boundary. For now, straight-line distance is close enough.
    var dx = p1.attr("cx") - p2.attr("cx");
    var dy = p1.attr("cy") - p2.attr("cy");
    return Math.sqrt(dx * dx + dy * dy);
}

function make_path_from_circle(rad, x, y) {
    return M(x, y - rad) + " " +
           A(rad, x, y + rad) + " " +
           A(rad, x, y - rad);
}


function update_pbounds(player, in_bounds, colour, opacity) {
    player.data("in_bounds", in_bounds);
    player.attr({
        stroke: colour,
        opacity: opacity
    });
}
function out_of_bounds(player) {
    update_pbounds(player, false, "lightgrey", .4);
}

function straddling_bounds(player) {
    update_pbounds(player, false, "grey", .6);
}

function in_bounds(player) {
    update_pbounds(player, true, "black", .8);
}

function update_bounds(players) {
    for (var i = 0; i < players.length; i++) {
        // Check if this player is in bounds, straddling, or out of bounds.
        var x = players[i].attr("cx");
        var y = players[i].attr("cy");
        var ppath = make_path_from_circle(player_radius, x, y);
        var pts = Raphael.pathIntersection(inner_boundary, ppath);
        if (pts.length == 2) {
            // straddling inner boundary
            straddling_bounds(players[i]);
        } else {
            pts = Raphael.pathIntersection(outer_boundary, ppath);
            if (pts.length == 2) {
                // Straddling outer boundary
                straddling_bounds(players[i]);
            } else {
                // Totally out or totally in.
                // Note we can safely check the centre point of the circle
                // because if we're less than player_radius away, we would
                // be intersecting the path.
                if (Raphael.isPointInsidePath(inner_boundary, x, y)) {
                    // Totally out on the interior of the track.
                    out_of_bounds(players[i]);
                } else {
                    if (Raphael.isPointInsidePath(outer_boundary, x, y)) {
                        // Totally within the track! yay!
                        in_bounds(players[i]);
                    } else {
                        // Totally out on the outside of the track.
                        out_of_bounds(players[i]);
                    }
                }
            }
        }
    }
}

function define_pack(players) {
    var distances = new Array(blocker_count);
    for (var i = 0; i < blocker_count; i++) {
        distances[i] = new Array(blocker_count);
    }
    var checked = {};

    // Calculate distances between blockers.
    for (var i = 0; i < blocker_count - 1; i++) {
        if (!players[i].data("in_bounds")) {
            console.log("Player " + players[i].data("label") + " is out of bounds. Skipping.");
            checked[players[i].data("label")] = true;
            continue;
        }

        for (var j = i+1; j < blocker_count; j++) {
            var d = distance(players[i], players[j]) / 10.0;
            distances[i][j] = d;
            distances[j][i] = d;
        }
    }

    var potential_packs = [];
    for (var i = 0; i < blocker_count; i++) {
        var label = players[i].data("label");

        if (checked[label]) continue;
        if (!players[i].data("in_bounds")) continue;

        var current_pack = {};
        var pq = [i]
        while (pq.length > 0) {
            var l = pq.pop();
            for (var p = 0; p < blocker_count; p++) {
                if (p == l) continue;
                if (players[p].data("in_bounds")) {
                    var plabel = players[p].data("label");
                    if (distances[p][l] < 10 && !current_pack[plabel]) {
                        current_pack[plabel] = true;
                        pq.push(p);
                        checked[plabel] = true;
                    }
                }
            }
        }

        var potential_pack = Object.keys(current_pack).sort();
        if (potential_pack.length > 1)
            potential_packs.push(potential_pack)
    }

    var lengths = {};
    var largest_pack = null;
    for (var i = 0; i < potential_packs.length; i++) {
        var pack = potential_packs[i];
        console.log("Checking pack #" + (i + 1) + ": " + potential_packs[i].join(","));
        if (pack.length < 2) {
            console.log("  pack disqualified: not enough members - only " + pack.length);
        }
        // Packs are sorted.  Easiest way to check for "one from each team" is to
        // see if the first char of the first member is the same as the first char
        // of the last member.
        if (pack[0][0] == pack[pack.length-1][0]) {
            console.log("  pack disquaified: all the same colour");
            continue
        }

        if (lengths[pack.length]) lengths[pack.length]++;
        else                      lengths[pack.length] = 1;

        if (largest_pack == null || largest_pack.length < pack.length) {
            largest_pack = pack;
        }
    }

    var valid_pack_exists = false;
    var no_pack = null;
    console.log("Lengths:" + JSON.stringify(lengths));
    if (largest_pack != null) {
        console.log("Largest pack was: " + largest_pack.join(","));
        valid_pack_exists = true;
        if (lengths[largest_pack.length] > 1) {
            valid_pack_exists = false;
            no_pack = "There are " + lengths[largest_pack.length] +
                              " packs of equal size (" + largest_pack.length +
                              " blockers each)";
            console.log("NO PACK! " + no_pack);
        }
    } else {
        valid_pack_exists = false;
        no_pack = "There are no candidate packs";
        console.log("NO PACK! " + no_pack);
    }

    if (valid_pack_exists) {
        // no_pack_message.hide();
        no_pack_message.attr({"text": "Pack contains the " + largest_pack.length + " blockers in red."});
    } else {
        no_pack_message.attr({"text": "NO PACK! " + no_pack});
        // no_pack_message.show();
    }

    var in_pack = players[0].paper.set();
    var not_in_pack = players[0].paper.set();
    for (var i = 0; i < blocker_count; i++) {
        var l = players[i].data("label")

        if (valid_pack_exists && largest_pack.indexOf(l) >= 0) {
            in_pack.push(players[i]);
        } else {
            not_in_pack.push(players[i]);
        }
    }

    in_pack.attr({stroke: "orangered"});
    not_in_pack.attr({stroke: "seagreen"});
}

function draw_track(R) {
    // See http://wftda.com/rules/wftda-rules-appendix-a-track-design.pdf
    var inner_arc1 = M(inner_cx1, inner_cy1 - inner_rad) + " " +
                     A(inner_rad, inner_cx1, inner_cy1 + inner_rad);
    var inner_bottom_line = L(inner_cx2, inner_cy2 + inner_rad);
    var inner_arc2 = M(inner_cx2, inner_cy2 + inner_rad) + " " +
                     A(inner_rad, inner_cx2, inner_cy2 - inner_rad);
    var inner_top_line = L(inner_cx1, inner_cy1 - inner_rad);
    inner_boundary = [inner_arc1, inner_bottom_line, inner_arc2, inner_top_line].join(" ");
    var inner = R.path(inner_boundary).attr({stroke: "#000"});


    var outer_arc1 = M(outer_cx1, outer_cy1 - outer_rad) + " " +
                    A(outer_rad, outer_cx1, outer_cy1 + outer_rad);
    var outer_bottom_line = L(outer_cx2, outer_cy2 + outer_rad);
    var outer_arc2 = M(outer_cx2, outer_cy2 + outer_rad) + " " +
                     A(outer_rad, outer_cx2, outer_cy2 - outer_rad);
    var outer_top_line = L(outer_cx1, outer_cy1 - outer_rad);
    outer_boundary = [outer_arc1, outer_bottom_line, outer_arc2, outer_top_line].join(" ");
    var outer = R.path(outer_boundary).attr({stroke: "#000"});

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
