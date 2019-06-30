let VKGeo = (function() {
    "use strict";

    const UPDATE_INTERVAL          = 60000;
    const DATA_TIMEOUT             = 24 * 60 * 60;
    const MARKER_IMAGE_SIZE        = 48;
    const CONTROL_PANEL_IMAGE_SIZE = 64;
    const MAP_CENTER_ROTATION      = 0.0;
    const MAP_CENTER_ZOOM          = 16.0;
    const VK_ACCESS_SETTINGS       = 2048 | 2;
    const VK_REQUEST_INTERVAL      = 500;
    const VK_MAX_BATCH_SIZE        = 25;
    const VK_MAX_NOTES_GET_COUNT   = 100;
    const VK_API_V                 = "5.92";
    const DATA_NOTE_TITLE          = "VKGeo Data";
    const DEFAULT_PHOTO_100_URL    = "images/camera_100.png";

    function requestSettings() {
        VK.callMethod("showSettingsBox", VK_ACCESS_SETTINGS);
    }

    function createControlPanelImage(img_class, user_id, battery_status, battery_level, src, size) {
        function drawIcon() {
            if ((image === null || (image.complete && image.naturalWidth > 0)) &&
                (label === null || (label.complete && label.naturalWidth > 0))) {
                const angle   = Math.PI / 4;
                let   radius  = Math.min(size[0], size[1]) / 2;
                let   context = canvas.getContext("2d");

                context.save();

                context.beginPath();
                context.arc(size[0] / 2, size[1] / 2, radius, 0, 2 * Math.PI, false);
                context.clip();

                if (image) {
                    context.drawImage(image, 0, 0, size[0], size[1]);
                }

                context.restore();

                if (label) {
                    context.drawImage(label, size[0] / 2 + radius * Math.sin(angle) - label.width  / 2,
                                             size[1] / 2 + radius * Math.cos(angle) - label.height / 2);
                }
            }
        }

        let canvas = document.createElement("canvas");
        let image  = null;
        let label  = null;

        canvas.width           = size[0];
        canvas.height          = size[1];
        canvas.className       = "controlPanelImage";
        canvas.style.minWidth  = size[0] + "px";
        canvas.style.minHeight = size[1] + "px";

        if (img_class === "SHOW_MARKER") {
            canvas.onclick = function() {
                let marker = marker_source.getFeatureById(user_id);

                if (marker) {
                    map_was_touched = true;
                    tracked_marker  = marker;

                    centerOnTrackedMarker();
                }
            };
        } else if (img_class === "SHOW_ALL") {
            canvas.onclick = function() {
                map_was_touched = true;
                tracked_marker  = null;

                fitMapToAllMarkers();
            };
        }

        image = document.createElement("img");

        image.crossOrigin = "anonymous";
        image.onload      = drawIcon;

        if (src.match(/camera_100\.png/)) {
            image.src = DEFAULT_PHOTO_100_URL;
        } else {
            image.src = src;
        }

        if (battery_status === "CHARGING" || battery_status === "DISCHARGING") {
            label = document.createElement("img");

            label.crossOrigin = "anonymous";
            label.onload      = drawIcon;

            if (battery_level < 25) {
                if (battery_status === "CHARGING") {
                    label.src = "images/avatar_battery_25_charging_label.png";
                } else {
                    label.src = "images/avatar_battery_25_label.png";
                }
            } else if (battery_level < 50) {
                if (battery_status === "CHARGING") {
                    label.src = "images/avatar_battery_50_charging_label.png";
                } else {
                    label.src = "images/avatar_battery_50_label.png";
                }
            } else if (battery_level < 75) {
                if (battery_status === "CHARGING") {
                    label.src = "images/avatar_battery_75_charging_label.png";
                } else {
                    label.src = "images/avatar_battery_75_label.png";
                }
            } else {
                if (battery_status === "CHARGING") {
                    label.src = "images/avatar_battery_100_charging_label.png";
                } else {
                    label.src = "images/avatar_battery_100_label.png";
                }
            }
        }

        return canvas;
    }

    function createMarkerImage(marker, update_time, src, size) {
        return new ol.style.Icon({
            "img": (function() {
                function drawIcon() {
                    if ((image === null || (image.complete && image.naturalWidth > 0)) &&
                        (label === null || (label.complete && label.naturalWidth > 0))) {
                        const angle   = Math.PI / 4;
                        let   radius  = Math.min(size[0], size[1]) / 2;
                        let   context = canvas.getContext("2d");

                        context.save();

                        context.beginPath();
                        context.arc(size[0] / 2, size[1] / 2, radius, 0, 2 * Math.PI, false);
                        context.clip();

                        if (image) {
                            context.drawImage(image, 0, 0, size[0], size[1]);
                        }

                        context.restore();

                        if (label) {
                            context.drawImage(label, size[0] / 2 + radius * Math.sin(angle) - label.width  / 2,
                                                     size[1] / 2 + radius * Math.cos(angle) - label.height / 2);
                        }

                        marker.changed();
                    }
                }

                let canvas = document.createElement("canvas");
                let image  = null;
                let label  = null;

                canvas.width  = size[0];
                canvas.height = size[1];

                image = document.createElement("img");

                image.crossOrigin = "anonymous";
                image.onload      = drawIcon;

                if (src.match(/camera_100\.png/)) {
                    image.src = DEFAULT_PHOTO_100_URL;
                } else {
                    image.src = src;
                }

                if ((new Date()).getTime() / 1000 - update_time > DATA_TIMEOUT) {
                    label = document.createElement("img");

                    label.crossOrigin = "anonymous";
                    label.onload      = drawIcon;
                    label.src         = "images/avatar_obsolete_data_label.png";
                }

                return canvas;
            })(),
            "imgSize": size
        });
    }

    function centerOnTrackedMarker() {
        if (tracked_marker) {
            map.getView().setCenter(tracked_marker.getGeometry().getCoordinates());
            map.getView().setRotation(MAP_CENTER_ROTATION);
            map.getView().setZoom(MAP_CENTER_ZOOM);
        }
    }

    function fitMapToAllMarkers() {
        let markers = marker_source.getFeatures();

        if (markers && markers.length > 0) {
            let extent = markers[0].getGeometry().getExtent();

            for (let i = 1; i < markers.length; i++) {
                ol.extent.extend(extent, markers[i].getGeometry().getExtent());
            }

            let ad_panel_height     = 0;
            let control_panel_width = 0;

            if (document.getElementById("adPanel").offsetHeight) {
                ad_panel_height = document.getElementById("adPanel").offsetHeight;
            }
            if (document.getElementById("controlPanel").offsetWidth) {
                control_panel_width = document.getElementById("controlPanel").offsetWidth;
            }

            map.getView().fit(extent, {
                "padding": [MARKER_IMAGE_SIZE,
                            MARKER_IMAGE_SIZE + control_panel_width,
                            MARKER_IMAGE_SIZE + ad_panel_height,
                            MARKER_IMAGE_SIZE],
                "maxZoom": MAP_CENTER_ZOOM
            });
        }
    }

    function runPeriodicUpdate() {
        let friends_list = [];

        function showInvitationPanel() {
            document.getElementById("invitationPanelText").innerHTML = _("This app is a web companion for VKGeo Friends on Map mobile application. <a href=\"https://vkgeo.sourceforge.io\" target=\"_blank\" rel=\"noopener\">Install VKGeo on your mobile device</a> and invite friends to it so you can see each other on the map.");

            document.getElementById("invitationPanel").style.display = "flex";
        }

        function hideInvitationPanel() {
            document.getElementById("invitationPanel").style.display = "none";
        }

        function updateControlPanel(friends_map) {
            let friends_on_map = 0;

            let control_panel = document.getElementById("controlPanel");

            while (control_panel.lastChild) {
                control_panel.removeChild(control_panel.lastChild);
            }

            control_panel.appendChild(createControlPanelImage("SHOW_ALL", "", "", 0, "images/button_show_all.png", [CONTROL_PANEL_IMAGE_SIZE, CONTROL_PANEL_IMAGE_SIZE]));

            let markers = marker_source.getFeatures();

            if (markers) {
                for (let i = 0; i < markers.length; i++) {
                    let user_id = markers[i].getId();

                    if (user_id === "") {
                        let my_image = createControlPanelImage("SHOW_MARKER", "", "", 0, my_photo_100, [CONTROL_PANEL_IMAGE_SIZE, CONTROL_PANEL_IMAGE_SIZE]);

                        if (control_panel.firstChild && control_panel.firstChild.nextSibling) {
                            control_panel.insertBefore(my_image, control_panel.firstChild.nextSibling);
                        } else {
                            control_panel.appendChild(my_image);
                        }
                    } else if (friends_map.hasOwnProperty(user_id)) {
                        control_panel.appendChild(createControlPanelImage("SHOW_MARKER", user_id, friends_map[user_id].battery_status,
                                                                                                  friends_map[user_id].battery_level,
                                                                                                  friends_map[user_id].photo_100, [CONTROL_PANEL_IMAGE_SIZE, CONTROL_PANEL_IMAGE_SIZE]));

                        friends_on_map++;
                    }
                }
            }

            return (friends_on_map > 0);
        }

        function cleanupMarkers(updated_friends) {
            let markers = marker_source.getFeatures();

            if (markers) {
                let markers_to_remove = [];

                for (let i = 0; i < markers.length; i++) {
                    if (markers[i].getId() !== "" && !updated_friends.hasOwnProperty(markers[i].getId())) {
                        markers_to_remove.push(markers[i]);
                    }
                }

                for (let i = 0; i < markers_to_remove.length; i++) {
                    if (tracked_marker === markers_to_remove[i]) {
                        tracked_marker = null;
                    }

                    marker_source.removeFeature(markers_to_remove[i]);
                }
            }

            if (tracked_marker !== null) {
                centerOnTrackedMarker();
            } else if (!map_was_touched) {
                fitMapToAllMarkers();
            }
        }

        function updateFriends(data, offset) {
            if (data.hasOwnProperty("response")) {
                if (data.response && data.response.items) {
                    friends_list = friends_list.concat(data.response.items);

                    if (data.response.items.length > 0 && offset + data.response.items.length < data.response.count) {
                        setTimeout(function() {
                            VK.api("friends.get", {
                                "fields": "photo_100",
                                "offset": offset + data.response.items.length,
                                "v":      VK_API_V
                            }, function(data) {
                                updateFriends(data, offset + data.response.items.length);
                            });
                        }, VK_REQUEST_INTERVAL);
                    } else {
                        let friends_map         = {};
                        let accessible_frnd_ids = [];

                        for (let i = 0; i < friends_list.length; i++) {
                            if (friends_list[i].hasOwnProperty("id") && typeof friends_list[i].id === "number"
                                                                     && !isNaN(friends_list[i].id) && isFinite(friends_list[i].id)) {
                                if (!friends_list[i].deactivated) {
                                    let user_id = friends_list[i].id.toString();

                                    friends_map[user_id] = {};

                                    if (friends_list[i].hasOwnProperty("first_name") && typeof friends_list[i].first_name === "string") {
                                        friends_map[user_id].first_name = friends_list[i].first_name;
                                    } else {
                                        friends_map[user_id].first_name = "";
                                    }
                                    if (friends_list[i].hasOwnProperty("last_name") && typeof friends_list[i].last_name === "string") {
                                        friends_map[user_id].last_name = friends_list[i].last_name;
                                    } else {
                                        friends_map[user_id].last_name = "";
                                    }
                                    if (friends_list[i].hasOwnProperty("photo_100") && typeof friends_list[i].photo_100 === "string") {
                                        friends_map[user_id].photo_100 = friends_list[i].photo_100;
                                    } else {
                                        friends_map[user_id].photo_100 = DEFAULT_PHOTO_100_URL;
                                    }

                                    friends_map[user_id].update_time    = 0;
                                    friends_map[user_id].latitude       = 0;
                                    friends_map[user_id].longitude      = 0;
                                    friends_map[user_id].battery_status = "";
                                    friends_map[user_id].battery_level  = 0;

                                    if (!friends_list[i].is_closed || friends_list[i].can_access_closed) {
                                        accessible_frnd_ids.push(friends_list[i].id);
                                    }
                                }
                            } else {
                                console.log("updateFriends() : invalid friend entry");
                            }
                        }

                        if (accessible_frnd_ids.length > 0) {
                            let notes_req_count = 0;
                            let notes_list      = [];

                            for (let i = 0; i < accessible_frnd_ids.length; i = i + VK_MAX_BATCH_SIZE) {
                                let execute_code = "return [";

                                for (let j = 0; j < VK_MAX_BATCH_SIZE; j++) {
                                    if (i + j < accessible_frnd_ids.length) {
                                        execute_code = execute_code + "API.notes.get({\"user_id\":" + accessible_frnd_ids[i + j] + ",\"count\":" + VK_MAX_NOTES_GET_COUNT + ",\"sort\":0}).items";

                                        if (j < VK_MAX_BATCH_SIZE - 1 && i + j < accessible_frnd_ids.length - 1) {
                                            execute_code = execute_code + ",";
                                        }
                                    } else {
                                        break;
                                    }
                                }

                                execute_code = execute_code + "];";

                                setTimeout(function() {
                                    VK.api("execute", {
                                        "code": execute_code,
                                        "v":    VK_API_V
                                    }, function(data) {
                                        if (data.hasOwnProperty("response")) {
                                            if (data.response) {
                                                for (let i = 0; i < data.response.length; i++) {
                                                    if (data.response[i]) {
                                                        for (let j = 0; j < data.response[i].length; j++) {
                                                            if (data.response[i][j] && data.response[i][j].title === DATA_NOTE_TITLE) {
                                                                notes_list.push(data.response[i][j]);

                                                                break;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        } else {
                                            if (data.hasOwnProperty("error") && data.error) {
                                                console.log("updateFriends() : execute(notes.get) request failed : " + data.error.error_msg);
                                            } else {
                                                console.log("updateFriends() : execute(notes.get) request failed : " + data);
                                            }
                                        }

                                        notes_req_count--;

                                        if (notes_req_count === 0) {
                                            let updated_friends = {};

                                            for (let i = 0; i < notes_list.length; i++) {
                                                if (notes_list[i].hasOwnProperty("text")     && typeof notes_list[i].text     === "string" &&
                                                    notes_list[i].hasOwnProperty("owner_id") && typeof notes_list[i].owner_id === "number"
                                                                                             && !isNaN(notes_list[i].owner_id) && isFinite(notes_list[i].owner_id)) {
                                                    let user_id = notes_list[i].owner_id.toString();

                                                    if (friends_map.hasOwnProperty(user_id)) {
                                                        let base64_regexp = /\{\{\{([^\}]+)\}\}\}/;
                                                        let regexp_result = base64_regexp.exec(notes_list[i].text);

                                                        if (regexp_result && regexp_result.length === 2) {
                                                            let user_data = null;

                                                            try {
                                                                user_data = JSON.parse(atob(regexp_result[1]));
                                                            } catch (ex) {
                                                                console.log("updateFriends() : invalid user data");
                                                            }

                                                            if (user_data && user_data.hasOwnProperty("update_time") && typeof user_data.update_time === "number"
                                                                                                                     && !isNaN(user_data.update_time) && isFinite(user_data.update_time) &&
                                                                             user_data.hasOwnProperty("latitude")    && typeof user_data.latitude === "number"
                                                                                                                     && !isNaN(user_data.latitude) && isFinite(user_data.latitude) &&
                                                                             user_data.hasOwnProperty("longitude")   && typeof user_data.longitude === "number"
                                                                                                                     && !isNaN(user_data.longitude) && isFinite(user_data.longitude)) {
                                                                friends_map[user_id].update_time = user_data.update_time;
                                                                friends_map[user_id].latitude    = user_data.latitude;
                                                                friends_map[user_id].longitude   = user_data.longitude;

                                                                let frnd_marker = marker_source.getFeatureById(user_id);

                                                                if (frnd_marker === null) {
                                                                    frnd_marker = new ol.Feature({
                                                                        "geometry": new ol.geom.Point(ol.proj.fromLonLat([friends_map[user_id].longitude, friends_map[user_id].latitude]))
                                                                    });

                                                                    frnd_marker.setId(user_id);

                                                                    marker_source.addFeature(frnd_marker);
                                                                } else {
                                                                    frnd_marker.setGeometry(new ol.geom.Point(ol.proj.fromLonLat([friends_map[user_id].longitude, friends_map[user_id].latitude])));
                                                                }

                                                                frnd_marker.setStyle(new ol.style.Style({
                                                                    "image": createMarkerImage(frnd_marker, friends_map[user_id].update_time, friends_map[user_id].photo_100, [MARKER_IMAGE_SIZE, MARKER_IMAGE_SIZE])
                                                                }));

                                                                frnd_marker.set("firstName",  friends_map[user_id].first_name);
                                                                frnd_marker.set("lastName",   friends_map[user_id].last_name);
                                                                frnd_marker.set("updateTime", friends_map[user_id].update_time);

                                                                if (user_data.hasOwnProperty("battery_status") && typeof user_data.battery_status === "string" &&
                                                                    user_data.hasOwnProperty("battery_level")  && typeof user_data.battery_level  === "number"
                                                                                                               && !isNaN(user_data.battery_level) && isFinite(user_data.battery_level)) {
                                                                    friends_map[user_id].battery_status = user_data.battery_status;
                                                                    friends_map[user_id].battery_level  = user_data.battery_level;
                                                                }

                                                                updated_friends[user_id] = true;
                                                            }
                                                        } else {
                                                            console.log("updateFriends() : invalid user data");
                                                        }
                                                    }
                                                } else {
                                                    console.log("updateFriends() : invalid note entry");
                                                }
                                            }

                                            cleanupMarkers(updated_friends);

                                            if (updateControlPanel(friends_map)) {
                                                hideInvitationPanel();
                                            } else {
                                                showInvitationPanel();
                                            }

                                            setTimeout(runPeriodicUpdate, UPDATE_INTERVAL);
                                        }
                                    });
                                }, VK_REQUEST_INTERVAL * (i + VK_MAX_BATCH_SIZE) / VK_MAX_BATCH_SIZE);

                                notes_req_count++;
                            }
                        } else {
                            cleanupMarkers({});

                            if (updateControlPanel({})) {
                                hideInvitationPanel();
                            } else {
                                showInvitationPanel();
                            }

                            setTimeout(runPeriodicUpdate, UPDATE_INTERVAL);
                        }
                    }
                } else {
                    cleanupMarkers({});

                    if (updateControlPanel({})) {
                        hideInvitationPanel();
                    } else {
                        showInvitationPanel();
                    }

                    setTimeout(runPeriodicUpdate, UPDATE_INTERVAL);
                }
            } else {
                if (data.hasOwnProperty("error") && data.error) {
                    console.log("updateFriends() : friends.get request failed : " + data.error.error_msg);
                } else {
                    console.log("updateFriends() : friends.get request failed : " + data);
                }

                setTimeout(runPeriodicUpdate, UPDATE_INTERVAL);
            }
        }

        setTimeout(function() {
            VK.api("friends.get", {
                "fields": "photo_100",
                "v":      VK_API_V
            }, function(data) {
                updateFriends(data, 0);
            });
        }, VK_REQUEST_INTERVAL);
    }

    let map_was_touched = false;
    let my_photo_100    = DEFAULT_PHOTO_100_URL;
    let my_marker       = null;
    let tracked_marker  = null;

    let marker_source = new ol.source.Vector({
        "features": []
    });

    let map = new ol.Map({
        "target": "map",
        "layers": [
            new ol.layer.Tile({
                "source": new ol.source.OSM({
                    "url": "https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}@2x.png"
                })
            }),
            new ol.layer.Vector({
                "source": marker_source
            })
        ],
        "overlays": [
            new ol.Overlay({
                "id":          "markerTooltip",
                "element":     document.getElementById("markerTooltip"),
                "offset":      [8, 0],
                "positioning": "bottom-left"
            })
        ],
        "view": new ol.View({
            "center": ol.proj.fromLonLat([0.0, 0.0]),
            "zoom":   0
        }),
        "controls": ol.control.defaults({
            "attributionOptions": {
                "collapsible": true
            }
        })
    });
    map.on("singleclick", function(event) {
        map.forEachFeatureAtPixel(event.pixel, function(feature, layer) {
            if (feature.getId()) {
                window.open("https://vk.com/id" + feature.getId());
            }
        });
    });
    map.on("pointermove", function(event) {
        let feature = map.forEachFeatureAtPixel(event.pixel, function(feature, layer) {
            return feature;
        });

        if (feature) {
            map.getOverlayById("markerTooltip").setPosition(event.coordinate);

            document.getElementById("markerTooltipNameText").innerHTML       = escapeHtml(_("{0} {1}", feature.get("firstName"),
                                                                                                       feature.get("lastName")));
            document.getElementById("markerTooltipUpdateTimeText").innerHTML = escapeHtml(_("{0}",     (new Date(feature.get("updateTime") * 1000))
                                                                                                            .toLocaleString()));

            document.getElementById("markerTooltip").style.display = "flex";
        } else {
            document.getElementById("markerTooltip").style.display = "none";
        }
    });
    map.on("dblclick", function(event) {
        map_was_touched = true;
        tracked_marker  = null;
    });
    map.on("pointerdrag", function(event) {
        map_was_touched = true;
        tracked_marker  = null;
    });

    try {
        VK.init(function() {
            function init() {
                document.getElementById("adPanel").style.display      = "flex";
                document.getElementById("controlPanel").style.display = "flex";

                VK.Widgets.Ads("adPanel", {}, {
                    "ad_unit_id":     105075,
                    "ad_unit_hash":   "498223b8d2f6d0f460567d0b69f52cfc",
                    "ad_unit_width":  260,
                    "ad_unit_height": 125,
                    "ad_unit_type":   "horizontal",
                    "ad_type":        "horizontal",
                    "ads_count":      1
                });

                runPeriodicUpdate();

                if ("geolocation" in navigator) {
                    navigator.geolocation.watchPosition(function(position) {
                        if (my_marker === null) {
                            VK.api("users.get", {
                                "fields": "photo_100",
                                "v":      VK_API_V
                            }, function(data) {
                                if (my_marker === null) {
                                    if (data.hasOwnProperty("response")) {
                                        if (data.response && data.response.length === 1) {
                                            if (data.response[0].hasOwnProperty("photo_100") && typeof data.response[0].photo_100 === "string") {
                                                my_photo_100 = data.response[0].photo_100;
                                            } else {
                                                my_photo_100 = DEFAULT_PHOTO_100_URL;
                                            }

                                            my_marker = new ol.Feature({
                                                "geometry": new ol.geom.Point(ol.proj.fromLonLat([position.coords.longitude, position.coords.latitude]))
                                            });

                                            my_marker.setId("");

                                            my_marker.setStyle(new ol.style.Style({
                                                "image": createMarkerImage(my_marker, (new Date()).getTime() / 1000, my_photo_100, [MARKER_IMAGE_SIZE, MARKER_IMAGE_SIZE])
                                            }));

                                            marker_source.addFeature(my_marker);

                                            if (data.response[0].hasOwnProperty("first_name") && typeof data.response[0].first_name === "string") {
                                                my_marker.set("firstName", data.response[0].first_name);
                                            } else {
                                                my_marker.set("firstName", "");
                                            }
                                            if (data.response[0].hasOwnProperty("last_name") && typeof data.response[0].last_name === "string") {
                                                my_marker.set("lastName", data.response[0].last_name);
                                            } else {
                                                my_marker.set("lastName", "");
                                            }

                                            my_marker.set("updateTime", (new Date()).getTime() / 1000);

                                            if (tracked_marker !== null) {
                                                centerOnTrackedMarker();
                                            } else if (!map_was_touched) {
                                                fitMapToAllMarkers();
                                            }

                                            let control_panel = document.getElementById("controlPanel");
                                            let my_image      = createControlPanelImage("SHOW_MARKER", "", "", 0, my_photo_100, [CONTROL_PANEL_IMAGE_SIZE, CONTROL_PANEL_IMAGE_SIZE]);

                                            if (control_panel.firstChild && control_panel.firstChild.nextSibling) {
                                                control_panel.insertBefore(my_image, control_panel.firstChild.nextSibling);
                                            } else {
                                                control_panel.appendChild(my_image);
                                            }
                                        }
                                    } else {
                                        if (data.hasOwnProperty("error") && data.error) {
                                            console.log("init() : users.get request failed : " + data.error.error_msg);
                                        } else {
                                            console.log("init() : users.get request failed : " + data);
                                        }
                                    }
                                }
                            });
                        } else {
                            my_marker.setGeometry(new ol.geom.Point(ol.proj.fromLonLat([position.coords.longitude, position.coords.latitude])));

                            my_marker.set("updateTime", (new Date()).getTime() / 1000);

                            if (tracked_marker !== null) {
                                centerOnTrackedMarker();
                            } else if (!map_was_touched) {
                                fitMapToAllMarkers();
                            }
                        }
                    });
                }

                return true;
            }

            function showSettingsPanel() {
                document.getElementById("settingsPanelText").innerHTML   = escapeHtml(_("You should allow access to friends and notes to view location of your friends on the map."));
                document.getElementById("settingsPanelButton").innerHTML = escapeHtml(_("Settings"));

                document.getElementById("settingsPanel").style.display = "flex";
            }

            function hideSettingsPanel() {
                document.getElementById("settingsPanel").style.display = "none";
            }

            let initialized = false;
            let settings    = (new URL(document.location)).searchParams.get("api_settings");

            VK.addCallback("onSettingsChanged", function(settings) {
                if ((settings & VK_ACCESS_SETTINGS) === VK_ACCESS_SETTINGS) {
                    hideSettingsPanel();

                    if (!initialized) {
                        initialized = init();
                    }
                } else {
                    showSettingsPanel();
                }
            });
            VK.addCallback("onSettingsCancel", function() {
                showSettingsPanel();
            });

            if ((settings & VK_ACCESS_SETTINGS) === VK_ACCESS_SETTINGS) {
                initialized = init();
            } else {
                requestSettings();
            }
        }, function() {
            displayFatalError(_("VK initialization failed."));
        }, VK_API_V);
    } catch (ex) {
        displayFatalError(_("VK initialization failed."));

        throw ex;
    }

    return {
        "requestSettings": requestSettings
    };
})();