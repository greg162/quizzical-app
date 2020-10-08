class TableController {

  constructor() {
    this.data = [
      {
        name: 'Table 1',
        id: "table_1",
        custom_name: "",
        players: [],
      },
      {
        name: 'Table 2',
        id: "table_2",
        custom_name: "",
        players: [],
      },
      {
        name: 'table 3',
        id: "table_3",
        custom_name: "",
        players: [],
      },
      {
        name: 'Table 4',
        id: "table_4",
        custom_name: "",
        players: [],
      },
      {
        name: 'Table 5',
        id: "table_5",
        custom_nam: "",
        players: [],
      },
      {
        name: 'Table 6',
        id: "table_6",
        custom_name: "",
        players: [],
      }
    ];
  }

  tableIdExists(tableId) {
    return this.data.some(table => table.id == tableId);
  }

}
module.exports = TableController;
