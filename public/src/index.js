import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet-providers";

//initialize the map
const map = L.map("map").setView([49.25, -123.00], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


const mIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/128/684/684908.png",
    iconSize: [38, 38]
});



//cluster layer
const myClusterLayer = window.L.markerClusterGroup({
    iconCreateFunction: function (cluster) {
        return L.divIcon({
            html:  `<div class="cluster-div">` + cluster.getChildCount() + `</div>`
        })
    }
})

//add markers
var marker1 = L.marker([49.2, -123.0], {icon: mIcon}).addTo(map);
var marker2 = L.marker([49.6, -123.2], {icon: mIcon}).addTo(map);
var marker3 = L.marker([49.0, -123.5], {icon: mIcon}).addTo(map);

myClusterLayer.addLayer(marker1);
myClusterLayer.addLayer(marker2);
myClusterLayer.addLayer(marker3);

map.addLayer(myClusterLayer);