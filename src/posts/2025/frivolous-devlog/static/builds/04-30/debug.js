import * as State from "./state.js";

export const modules = {
  "assets":                 null,
  "character":              null,
  "coin":                   null,
  "enemy":                  null,
  "entity":                 null,
  "game":                   null,
  "index":                  null,
  "item":                   null,
  "map":                    null,
  "player":                 null,
  "projectile":             null,
  "state-character-select": null,
  "state-gamemaster":       null,
  "state-levelup":          null,
  "state-main-menu":        null,
  "state-map":              null,
  "state-pause":            null,
  "state":                 State,
  "utils":                  null,
};


export const modules_promise = (async function () {
  await Promise.all(Object.keys(modules).map((module_name) => {
    if (modules[module_name]) {
      return modules[module_name];
    }

    const import_promise = import(`./${module_name}.js`)
    import_promise.then((module_instance) => {
      modules[module_name] = module_instance;
    });
    return import_promise;
  }));

  return modules;
})();


export function getPlayerCharacter () {
  for (let state = game.state; state; state = state.prev) {
    if (state instanceof modules['state-map'].MapState) {
      return state.player.character;
    } else if (state instanceof modules['state-gamemaster'].GamemasterState) {
      return state.player_character;
    }
  }
  throw "Could not find player";
}


export function givePlayerItem (item_name) {
  const player = getPlayerCharacter();
  const item   = modules['item'].items[item_name];
  player.addItem(item);
  return item;
}
