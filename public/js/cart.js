const itemTemplate = document.getElementById("item-template");
const cartList = document.getElementById("cart-items");
function loadItems() {
    fetch("/getCartItems", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            cartList.innerHTML = ""; // Clear previous results
            console.log(data);
            data.forEach((item) => {
                let itemElement = itemTemplate.content.cloneNode(true);
                itemElement.querySelector(".name").innerHTML = item.name;
                itemElement.querySelector(".price").innerHTML =
                    item.price + " CAD";
                itemElement.querySelector(".type").innerHTML = item.type;
                cartList.appendChild(itemElement);
            });
        })
        .catch((err) => {
            console.error(err);
        });
}
loadItems();