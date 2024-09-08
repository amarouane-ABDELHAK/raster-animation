const mapboxgl = require("mapbox-gl");
const source_line_id = "measure-line-source";
const layer_line_id = "measure-layer-id";
import "./style.css";
const {
    calculateDistance
} = require("./utils");

mapboxgl.accessToken = process.env.MAP_ACCESS_TOKEN;
const MAP_STYLE = process.env.MAP_STYLE;

var measureToggled = true;
let markers = [];
let points = [];
let distanceMarker = false;

const map = new mapboxgl.Map({
    container: "map",
    style: MAP_STYLE, // You can choose any Mapbox style
    center: [-98, 39], // Initial center coordinates
    zoom: 4, // Initial zoom level
});

// disable map rotation using right click + drag
map.dragRotate.disable();

class MeasureButtonControl {
    onClick() {
        $("#layer-measure").toggleClass("mapbox-gl-draw_line fa-stop");
        // Toggle layer visibility
        measureToggled = !measureToggled;
        if(measureToggled) {
            removeLayers(source_line_id, [layer_line_id]);
            $("div.distance-computed").css({
                'display': 'none'
            });
        }
        // Set the map's center and zoom to the desired location

    }
    onAdd(map) {
        this.map = map;
        this.container = document.createElement("div");
        this.container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
        this.container.addEventListener("contextmenu", (e) => e.preventDefault());
        this.container.addEventListener("click", (e) => this.onClick());
        this.container.innerHTML =
            '<div class="tools-box">' +
            "<button>" +
            '<span id="layer-measure" class="mapboxgl-ctrl-icon btn fa mapbox-gl-draw_line" aria-hidden="true" title="Measure Distance"></span>' +
            "</button>" +
            "</div>";
        return this.container;
    }
    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = undefined;
    }
}


// Adding controls
map.addControl(new mapboxgl.ScaleControl());
map.addControl(new MeasureButtonControl());

function showHideLayers(layersIds, show) {
    layersIds.forEach(layerId => {
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(
                layerId,
                "visibility",
                show ? "visible" : "none"
            );
        }
    });
}

function removeLayers(sourceId, layersIds) {
    if (map.getSource(sourceId)) {
        layersIds.forEach(layerId => {
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
            }
        });
        map.removeSource(sourceId);
    }
}


function compute_distance(coordinates) {

    removeLayers(source_line_id, [layer_line_id]);
    points.push(coordinates);
    const markerEl = document.createElement("div");
    markerEl.className = "marker";
    const marker = new mapboxgl.Marker(markerEl)
    .setLngLat(coordinates)
    .addTo(map);
    markers.push(marker);
    if (points.length === 2) {
        const distance = calculateDistance(points[0], points[1]);
        const midPoint = [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2];
        markers.forEach(marker => marker.remove());
        markers = [];

        if (distanceMarker) {
            distanceMarker.remove();
            
        }

        const distanceElement = document.createElement("div");
        distanceElement.className = "distance-computed";
        distanceElement.style.display = "block";
        distanceElement.style.padding = "5px";
        distanceElement.style.borderRadius = "5px";
        distanceElement.style.color = "white";
        distanceElement.innerHTML = `${distance.toFixed(2)} km`;

        distanceMarker = new mapboxgl.Marker({
            element: distanceElement,
            anchor: 'bottom'
        })
        .setLngLat(midPoint)
        .addTo(map);

        const lineData = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: points
            }
        };

        if (map.getSource(source_line_id)) {
            map.getSource(source_line_id).setData(lineData);
        } else {
            map.addSource(source_line_id, { type: "geojson", data: lineData });
            map.addLayer({
                id: layer_line_id,
                type: "line",
                source: source_line_id,
                layout: {
                    "line-join": "round",
                    "line-cap": "round"
                },
                paint: {
                    "line-color": "blue",
                    "line-width": 2,
                    "line-dasharray": [2, 4]
                }
            });
        }

        points = []; // Reset points for new measurements
    }


}


async function main() {
    
    map.on("load", async () => {
        console.log("Hello map!");

        map.on("click", (event) => {
            if(!measureToggled) {
                const coordinates = [event.lngLat.lng, event.lngLat.lat];
                compute_distance(coordinates);
            }
        });
    });
}



main();
