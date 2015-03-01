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

var phlx = inner_cx2 - 300;
var phy = inner_cy2 + inner_rad - 1
var pack_hug_left_path = M(phlx + 10, phy) + " " + L(phlx, phy) + " " + L(phlx, phy + 150) + " " + L(phlx + 10, phy + 150);
var phrx = phlx + player_radius * 4 + 5;
var pack_hug_right_path = M(phrx - 10, phy) + " " + L(phrx, phy) + " " + L(phrx, phy + 150) + " " + L(phrx - 10, phy + 150);
var pack_hug_left = null;
var pack_hug_right = null;

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
    distance(players[0], players[1]);
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

    var jam_line_offset_ax = inner_cx2 - 300 + player_radius + 5;
    var jam_line_offset_bx = jam_line_offset_ax + player_radius + 10;
    var jam_line_offset_y = inner_cy2 + inner_rad + player_radius + 8;

    for (var i = 0; i < blockers_per_team; i++) {
        var a = make_player(R, jam_line_offset_ax, jam_line_offset_y,
                            i, "hsb(.3, 1, 1)", "a");

        var b = make_player(R, jam_line_offset_bx, jam_line_offset_y,
                            i, "hsb(.8, 1, 1)", "b");

        st.push(a, b);
        players.push(a);
        players.push(b);
    }

    st.drag(move, start, up);

    // "Pack is here" lines
    // pack_hug_left = R.path(pack_hug_left_path);
    // pack_hug_left.attr({stroke: "green", "stroke-width": 3, opacity: 0.0});

    // pack_hug_right = R.path(pack_hug_right_path);
    // pack_hug_right.attr({stroke: "green", "stroke-width": 3, opacity: 0.0});
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

function angle_fraction(x1, y1, x2, y2, x3, y3) {
    // find the inner angle
    //
    //        p1
    //       /
    //      /
    //     /  a
    //    /____________ p3
    //  p2
    var d12 = Math.pow(x2-x1,2) + Math.pow(y2-y1,2),
        d23 = Math.pow(x2-x3,2) + Math.pow(y2-y3,2),
        d13 = Math.pow(x3-x1,2) + Math.pow(y3-y1,2);
    var a = Math.acos((d12+d23-d13) / Math.sqrt(4*d12*d23));
    // console.log("Angle is " + (a * 180/Math.PI) + "°");

    // Return angle as a fraction of a half circle.
    return a / Math.PI;
}

// Let's define our own distance around the turns:
//   Full turn = 55 feet (550px)
//   x = angle from start of turn in degrees
//   Partial turn = x / 180 * 55
// This makes it less ambiguous than the official rules.
function angle_distance(fraction) {
    return fraction * 550;
}

function get_region(x, y) {
    //  Divide the track into regions:
    //
    //       _.-""""""""""""""""""""""-._
    //     .'      |       2       |      `.
    //    /        _________________        \
    //   |       .'                 `.       |
    //   |      /                     \      |
    //   |  3  |                       |  1  |
    //   |      \                     /      |
    //   |       `._________________.'       |
    //    \                                 /
    //     `._     |       4       |     _.'
    //        `-.......................-'

    // 1 - first curve
    // 2 - top straightaway
    // 3 - second curve
    // 4 - bottom straightaway (where jam/pivot lines are)

    if (x >= inner_cx2) {
        return 1;
    } else if (x <= inner_cx1) {
        return 3;
    } else if (y < inner_cy1) {
        return 2;
    } else {
        return 4;
    }
}

// In feet, not pixels.
// TODO: s/180/lap_distance constant/
function absolute_distance(counter_clockwise_distance) {
    var clockwise_distance = 180 - counter_clockwise_distance;
    return Math.min(counter_clockwise_distance, clockwise_distance);
}

function distance(p1, p2) {
    return distance_from(p1.attr("cx"), p1.attr("cy"), p2.attr("cx"), p2.attr("cy"));
}

// Measure the counter-clockwise distance from starting point sx, sy to the
// given player's x and y.
function distance_from(sx, sy, px, py) {
    var x_left = inner_cx1;
    var x_right = inner_cx2;
    var y_mid = inner_cy1;

    var sr = get_region(sx, sy);
    var pr = get_region(px, py);

    var turn_distance = angle_distance(1);
    var straight_distance = x_right - x_left;

    var r1d = 0,
        r2d = 0,
        r3d = 0,
        r4d = 0;

    // Gross.
    if (sr == 1) {
        var sf = angle_fraction(x_right, y_mid + 100, x_right, y_mid, sx, sy);
        var sd = angle_distance(sf);
        if (pr == 1) {
            var pf = angle_fraction(x_right, y_mid + 100, x_right, y_mid, px, py);
            var pd = angle_distance(pf);
            r1d = (pd - sd);
        } else {
            r1d = turn_distance - sd;
        }

        if (pr == 2) {
            r2d = x_right - px;
        } else if (pr != 1) {
            r2d = straight_distance;
        }

        if (pr == 3) {
            var pf = angle_fraction(x_left, y_mid - 100, x_left, y_mid, px, py);
            var pd = angle_distance(pf);
            r3d = pd;
        } else if (pr > 3) {
            r3d = turn_distance;
        }

        if (pr == 4) {
            r4d = px - x_left;
        }
    } else if (sr == 2) {
        if (pr == 2) {
            r2d = sx - px;
        } else {
            r2d = sx - x_left;
        }

        if (pr == 3) {
            var pf = angle_fraction(x_left, y_mid - 100, x_left, y_mid, px, py);
            var pd = angle_distance(pf);
            r3d = pd;
        } else if (pr != 2) {
            r3d = turn_distance;
        }

        if (pr == 4) {
            r4d = px - x_left;
        } else if (pr == 1) {
            r4d = straight_distance;
        }

        if (pr == 1) {
            var pf = angle_fraction(x_right, y_mid + 100, x_right, y_mid, px, py);
            var pd = angle_distance(pf);
            r1d = pd;
        }
    } else if (sr == 3) {
        var sf = angle_fraction(x_left, y_mid - 100, x_left, y_mid, sx, sy);
        var sd = angle_distance(sf);
        if (pr == 3) {
            var pf = angle_fraction(x_left, y_mid - 100, x_left, y_mid, px, py);
            var pd = angle_distance(pf);
            r3d = pd - sd;
        } else {
            r3d = turn_distance - sd;
        }

        if (pr == 4) {
            r4d = px - x_left;
        } else if (pr != 3) {
            r4d = straight_distance;
        }

        if (pr == 1) {
            var pf = angle_fraction(x_right, y_mid + 100, x_right, y_mid, px, py);
            var pd = angle_distance(pf);
            r1d = pd;
        } else if (pr == 2) {
            r1d = turn_distance;
        }

        if (pr == 2) {
            r2d = x_right - px;
        }
    } else if (sr == 4) {
        if (pr == 4) {
            r4d = px - sx;
        } else {
            r4d = x_right - sx;
        }

        if (pr == 1) {
            var pf = angle_fraction(x_right, y_mid + 100, x_right, y_mid, px, py);
            var pd = angle_distance(pf);
            r1d = pd;
        } else if (pr != 4) {
            r1d = turn_distance;
        }

        if (pr == 2) {
            r2d = x_right - px;
        } else if (pr == 3) {
            r2d = straight_distance;
        }

        if (pr == 3) {
            var pf = angle_fraction(x_left, y_mid - 100, x_left, y_mid, px, py);
            var pd = angle_distance(pf);
            r3d = pd;
        }
    }

    var total = r1d + r2d + r3d + r4d;

    // If player is behind reference point, add a full lap.
    if (total < 0) total += straight_distance * 2 + turn_distance * 2;

    var rds = [r1d, r2d, r3d, r4d].join("+");
    console.log("From (" + sx + "," + sy + ") to (" + px + "," + py + "): " + rds + "=" + total);

    return total;
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
                    if (absolute_distance(distances[p][l]) < 10 && !current_pack[plabel]) {
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
        if (pack.length < 2) {
            //console.log("  pack disqualified: not enough members - only " + pack.length);
            continue;
        }
        // Packs are sorted.  Easiest way to check for "one from each team" is to
        // see if the first char of the first member is the same as the first char
        // of the last member.
        if (pack[0][0] == pack[pack.length-1][0]) {
            //console.log("  pack disquaified: all the same colour");
            continue;
        }

        if (lengths[pack.length]) lengths[pack.length]++;
        else                      lengths[pack.length] = 1;

        if (largest_pack == null || largest_pack.length < pack.length) {
            largest_pack = pack;
        }
    }

    var valid_pack_exists = false;
    var no_pack = null;
    //console.log("Lengths:" + JSON.stringify(lengths));
    if (largest_pack != null) {
        //console.log("Largest pack was: " + largest_pack.join(","));
        valid_pack_exists = true;
        if (lengths[largest_pack.length] > 1) {
            valid_pack_exists = false;
            no_pack = "There are " + lengths[largest_pack.length] +
                      " packs of equal size (" + largest_pack.length +
                      " blockers each)";
            //console.log("NO PACK! " + no_pack);
        }
    } else {
        valid_pack_exists = false;
        no_pack = "There are no candidate packs";
        //console.log("NO PACK! " + no_pack);
    }

    var in_pack = players[0].paper.set();
    var not_in_pack = players[0].paper.set();
    var not_in_play = players[0].paper.set();
    var leftmost_x = null;
    var rightmost_x = null;
    var pack_hug_y = null;
    for (var i = 0; i < blocker_count; i++) {
        var l = players[i].data("label")

        // TODO: find clockwise-most and anticlockwise-most blocker instead of
        //       just left and right
        if (valid_pack_exists && largest_pack.indexOf(l) >= 0) {
            in_pack.push(players[i]);
            if (leftmost_x == null || players[i].attr("cx") < leftmost_x) {
                leftmost_x = players[i].attr("cx");
                pack_hug_y = players[i].attr("cy");
            }
            if (rightmost_x == null || players[i].attr("cx") > rightmost_x) {
                rightmost_x = players[i].attr("cx");
            }
        } else if (players[i].attr("in_bounds")) {
            not_in_pack.push(players[i]);
            // pack_hug_left.animate({opacity: 0.0}, 500, ">");
            // pack_hug_right.animate({opacity: 0.0}, 500, ">");
        } else {
            not_in_play.push(players[i]);
        }
    }

    //console.log("Leftmost x:" + leftmost_x);

    in_pack.attr({stroke: "white"});
    not_in_pack.attr({stroke: "red"});
    not_in_play.attr({stroke: "gray"});

    if (valid_pack_exists) {
        // no_pack_message.hide();
        // var lPath = Raphael.transformPath(pack_hug_left_path, 'T' + (leftmost_x - player_radius - 5 - phlx) + ',0');
        // testpath.animate({path: _transformedPath}, 1000);
        // pack_hug_left.animate({opacity: 1.0, path: lPath}, 500, "bounce");

        // var rPath = Raphael.transformPath(pack_hug_right_path, 'T' + (rightmost_x + player_radius + 5 - phrx) + ',0');
        // testpath.animate({path: _transformedPath}, 1000);
        // pack_hug_right.animate({opacity: 1.0, path: rPath}, 500, "bounce");
        // pack_hug_right.animate({opacity: 1.0}, 500, "bounce");
        no_pack_message.attr({"text": "Pack contains the " + largest_pack.length + " blockers in red."});
    } else {
        no_pack_message.attr({"text": "NO PACK! " + no_pack});
        // no_pack_message.show();
    }
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
    //console.log("central angle = " + rad2deg(inner_angle));

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
