const Item = require("./models/Item");

module.exports = () => {
  Item.count().exec((err, count) => {
    if (count > 0) {
      return;
    }

    const item1 = new Item({
      name: "Cereal"
    });
    const item2 = new Item({
      name: "Eggs"
    });
    const item3 = new Item({
      name: "Milk"
    });

    Item.create([item1, item2, item3], error => {
      if (!error) {
        // console.log('ready to go....');
      }
    });
  });
};
