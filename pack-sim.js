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
var inner_path = null;
var outer_boundary = null;
var outer_path = null;

var no_pack_message = null;

var max_pack_distance = 100;
var max_engagement_zone_distance = 200;

var turn_distance = angle_distance(1);
var straight_distance = inner_cx2 - inner_cx1;
var lap_distance = straight_distance * 2 + turn_distance * 2;

var pack_hug_back = null;
var pack_hug_front = null;

var DEBUG = false;

function debug(msg) {
    if (DEBUG) {
        console.log(msg);
    }
}

var start = function () {
    if (this.t) {
        // "this" is the player
        this.pox = this.attr("cx");
        this.poy = this.attr("cy");

        // move text too.
        this.tox = this.t.attr("x");
        this.toy = this.t.attr("y");
    } else {
        // "this" is the text
        this.tox = this.attr("x");
        this.toy = this.attr("y");

        // move player too.
        this.pox = this.p.attr("cx");
        this.poy = this.p.attr("cy");
    }


    this.animate({r: player_radius}, 500, ">");
},

move = function (dx, dy) {
    if (this.t) {
        this.attr({cx: this.pox + dx, cy: this.poy + dy});
        this.t.attr({x: this.tox + dx, y: this.toy + dy});
    } else {
        this.attr({x: this.tox + dx, y: this.toy + dy});
        this.p.attr({cx: this.pox + dx, cy: this.poy + dy});
    }
},
up = function () {
    this.animate({r: player_radius}, 500, ">");
    // TODO: just update the bounds of the player being moved.
    update_bounds(players);
    define_pack(players);
    //distance(players[0], players[1]);

    var h = "";
    for (var i = 0; i < players.length; i++) {
        h += (i == 0 ? "" : ",") + players[i].attr("cx") + "," + players[i].attr("cy");
    }
    window.location.hash = h;
};

function make_player(R, x, y, num, colour, team) {
    var player = R.circle(x, y + track_min_width / blockers_per_team * num, player_radius);
    player.attr({fill: colour, "stroke-width": 2});
    player.data("team", team);
    player.data("label", team + (num + 1));
    player.t = R.text(x, y + track_min_width / blockers_per_team * num, team + (num + 1));
    player.t.p = player;
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
                            i, "hsb(.3, 1, 1)", "G");

        var b = make_player(R, jam_line_offset_bx, jam_line_offset_y,
                            i, "hsb(.8, 1, 1)", "P");

        st.push(a, b, a.t, b.t);
        players.push(a);
        players.push(b);
    }

    st.drag(move, start, up);

    if (window.location.hash && window.location.hash.length > 1) {
        coords = window.location.hash.substring(1).split(",");
        if (coords.length == players.length * 2) {
            for (var i = 0; i < players.length; i++) {
                var px = parseFloat(coords[i * 2]);
                var py = parseFloat(coords[i * 2 + 1]);
                debug("Setting player " + i + " to (" + px + "," + py + ")");
                players[i].attr({cx: px, cy: py});
                players[i].t.attr({x: px, y: py});
            }
            update_bounds(players);
            define_pack(players);
        }
    }

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
    // debug("Angle is " + (a * 180/Math.PI) + "°");

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

function absolute_distance(counter_clockwise_distance) {
    var clockwise_distance = lap_distance - counter_clockwise_distance;
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
    if (total < 0) total += lap_distance;

    var rds = [r1d, r2d, r3d, r4d].join("+");
    // debug("From (" + sx + "," + sy + ") to (" + px + "," + py + "): " + rds + "=" + total);

    return total;
}

function make_path_from_circle(rad, x, y) {
    return M(x, y - rad) + " " +
           A(rad, x, y + rad) + " " +
           A(rad, x, y - rad);
}

function hug(back, front) {
    if (pack_hug_front != null) {
        pack_hug_front.remove();
    }
    if (pack_hug_back != null) {
        pack_hug_back.remove();
    }

    // If there's no pack, stop here.
    if (back == null || front == null) {
        return;
    }

    var R = back.paper;

    var bx = back.attr("cx");
    var by = back.attr("cy");
    var br = get_region(bx, by);
    var fx = front.attr("cx");
    var fy = front.attr("cy");
    var fr = get_region(fx, fy);

    var bp = M(inner_cx1, inner_cy1) + " " + L(bx, by);

    if (br == 1) {
        bp = M(inner_cx2, inner_cy2) + " " + L(bx, by);
    } else if (br == 2 || br == 4) {
        bp = M(bx, inner_cy2) + " " + L(bx, by);
    }
    pack_hug_back = R.path(bp);

    var bi = Raphael.pathIntersection(inner_boundary, bp);
    debug("Back intersection: " + JSON.stringify(bi));

    if (fr == 1) {
        pack_hug_front = R.path(M(inner_cx2, inner_cy2) + " " + L(fx, fy));
    } else if (fr == 2 || fr == 4) {
        pack_hug_front = R.path(M(fx, inner_cy2) + " " + L(fx, fy));
    } else {
        pack_hug_front = R.path(M(inner_cx1, inner_cy1) + " " + L(fx, fy));
    }

    pack_hug_front.attr({stroke: "green", "stroke-width": 3});
    pack_hug_back.attr({stroke: "green", "stroke-width": 3});
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
            var d = distance(players[i], players[j]);
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
                    if (absolute_distance(distances[p][l]) < max_pack_distance && !current_pack[plabel]) {
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
            //debug("  pack disqualified: not enough members - only " + pack.length);
            continue;
        }
        // Packs are sorted.  Easiest way to check for "one from each team" is to
        // see if the first char of the first member is the same as the first char
        // of the last member.
        if (pack[0][0] == pack[pack.length-1][0]) {
            //debug("  pack disquaified: all the same colour");
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
    //debug("Lengths:" + JSON.stringify(lengths));
    if (largest_pack != null) {
        //debug("Largest pack was: " + largest_pack.join(","));
        valid_pack_exists = true;
        if (lengths[largest_pack.length] > 1) {
            valid_pack_exists = false;
            no_pack = "There are " + lengths[largest_pack.length] +
                      " packs of equal size (" + largest_pack.length +
                      " blockers each)";
            //debug("NO PACK! " + no_pack);
        }
    } else {
        valid_pack_exists = false;
        no_pack = "There are no candidate packs";
        //debug("NO PACK! " + no_pack);
    }

    var in_pack = players[0].paper.set();
    var not_in_pack = players[0].paper.set();
    var not_in_play = players[0].paper.set();
    var leftmost_x = null;
    var rightmost_x = null;
    var pack_hug_y = null;

    // Fixed distance reference for finding front/back pack members.
    var fd_x = inner_cx2;
    var fd_y = inner_cy2 + inner_rad + 1;

    var pack_players = [];
    var non_pack_players = [];
    var furthest_distance = -1;
    var furthest_player = null;

    // The pack member furthest from a fixed point must be either the front or
    // back of the pack (though we don't know which). The pack member furthest
    // from the one we identify here is the other one. Then we just find out
    // which is which.
    for (var i = 0; i < blocker_count; i++) {
        var p = players[i];
        var l = p.data("label")

        if (valid_pack_exists && largest_pack.indexOf(l) >= 0) {
            in_pack.push(p);
            pack_players.push(p);
            var d = absolute_distance(distance_from(fd_x, fd_y, p.attr("cx"), p.attr("cy")));
            if (d > furthest_distance) {
                furthest_distance = d;
                furthest_player = p;
            }
        } else {
            non_pack_players.push(p);
        }
    }

    // The pack member furthest from the one we just identified is the other of
    // the front/back pair.
    var front_of_pack = null;
    var back_of_pack = null;
    var spread = 0;

    if (valid_pack_exists) {
        debug("Furthest player from (" + fd_x + "," + fd_y + ") is " +
            furthest_player.data("label") + " at (" + furthest_player.attr("cx") +
            "," + furthest_player.attr("cy") + ")");

        var other_fp = pack_players[0];
        var other_fd = absolute_distance(distance(furthest_player, other_fp));
        pack_players.forEach(function(pp){
            var d = absolute_distance(distance(furthest_player, pp));
            if (d > other_fd) {
                other_fd = d;
                other_fp = pp;
            }
        });

        debug("Other Furthest player is " + other_fp.data("label") +
            " at (" + other_fp.attr("cx") + "," + other_fp.attr("cy") + ")");

        // Guess.
        front_of_pack = furthest_player;
        back_of_pack = other_fp;
        spread = distance(back_of_pack, front_of_pack);

        // Then check and correct if needed.
        if (absolute_distance(spread) < spread) {
            // swap them.
            front_of_pack = other_fp;
            back_of_pack = furthest_player;
        }
    }

    hug(back_of_pack, front_of_pack);

    non_pack_players.forEach(function(p){
        if (valid_pack_exists && p.data("in_bounds")) {
            var front_distance = absolute_distance(distance(front_of_pack, p));
            var back_distance = absolute_distance(distance(back_of_pack, p));
            var min_distance = Math.min(front_distance, back_distance);
            debug("Player " + other_fp.data("label") + " is " + min_distance + " from the pack.");
            if (min_distance > max_engagement_zone_distance) {
                not_in_play.push(p);
            } else {
                // within engagement zone
                not_in_pack.push(p);
            }
        } else {
            not_in_play.push(p);
        }
    });

    in_pack.attr({stroke: "white"});
    not_in_pack.attr({stroke: "red"});
    not_in_play.attr({stroke: "gray"});

    if (valid_pack_exists) {
        // front_of_pack.attr({stroke: "yellow"});
        // back_of_pack.attr({stroke: "deeppink"});
        // no_pack_message.hide();
        no_pack_message.attr({"text": "Pack contains the " + largest_pack.length + " blockers in white."});
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
    inner_path = R.path(inner_boundary).attr({stroke: "#000"});


    var outer_arc1 = M(outer_cx1, outer_cy1 - outer_rad) + " " +
                    A(outer_rad, outer_cx1, outer_cy1 + outer_rad);
    var outer_bottom_line = L(outer_cx2, outer_cy2 + outer_rad);
    var outer_arc2 = M(outer_cx2, outer_cy2 + outer_rad) + " " +
                     A(outer_rad, outer_cx2, outer_cy2 - outer_rad);
    var outer_top_line = L(outer_cx1, outer_cy1 - outer_rad);
    outer_boundary = [outer_arc1, outer_bottom_line, outer_arc2, outer_top_line].join(" ");
    outer_path = R.path(outer_boundary).attr({stroke: "#000"});

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
    //debug("central angle = " + rad2deg(inner_angle));

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
