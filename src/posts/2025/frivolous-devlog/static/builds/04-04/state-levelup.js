import { ElementState } from "./state.js";
import { Character, Statset } from "./character.js";
import { makeElement, chooseRandomFrom } from "./utils.js";

class LevelUpState extends ElementState {
  constructor (obj={}) {
    super({...obj, element: {
      tag:     "div.layer",
      style: {
        overflowY: "scroll",
      },

      child: {
        tag: "section .panel .level-up .menu",
        style: {
          maxWidth: "800px",
          margin: "0 auto",
        },

        children: [
          { tag: "header",
            style: {
              maxWidth: "400px",
              fontSize: "2em",
              margin: "0 auto",
            },
            children: [
              { tag: "h1", text: "Level up!" },
              { tag: "h2", text: "Choose a stat to improve",
                style: { fontSize: "0.8em" },
              },
            ],
          },
        ],
      },
    }});

    this.panel_element = this.element.querySelector("section.panel");

    this.character = obj.character;
    if (!(this.character instanceof Character)) {
      throw new TypeError("character is not an instance of Character");
    }

    this.character_role = obj.character_role ?? "follower";
    this.num_options    = obj.num_options ?? 3;

    if (! this.character?.level_up_options?.length > 0) {
      throw "Character has no level-up options";
    }

    const valid_options = [];

    // Calculate valid options and generate the options list.
    // TODO: maybe calculate this on first tick? If the character is modified between this state being created and when the game arrives on this state, it could cause unexpected behavior.

    for (let option of this.character.level_up_options) {
      if (!option) { throw new TypeError("Option is falsey") }

      // Filter options based on roles

      if (option.only_on && option.only_on != this.character_role) {
        continue;
      }

      if (!(option.stat in this.character)) {
        throw `Stat not in character: ${option.stat}`;
      }

      // Copy option for inplace modification
      option = { ...option };

      option.sign = 1;
      option.limit_name = "max";
      if (option.max == null && option.min != null) {
        option.sign = -1;
        option.limit_name = "min";
      }

      option.increment ??= 1;
      option.increment *= option.sign;

      option.limit = option.max || option.min;
      option.current_value = this.character.base_stats[option.stat];

      if (option.limit != null) {
        if (option.sign > 0) {
          if (option.current_value >= option.limit) {
            continue;
          }
        } else {
          if (option.current_value <= option.limit) {
            continue;
          }
        }
      }

      valid_options.push(option);
    }

    const list_element = {
      tag: "ul .mobile-flex-column",
      children: [],
      style: {
        listStyle:      "none",
        padding:        "0",
        display:        "flex",
        justifyContent: "space-around",
        flexWrap:       "wrap",
        gap:            "1em",
      },
    };

    const random_options = chooseRandomFrom(valid_options, this.num_options);

    for (let option of random_options) {
      if (!option.stat) {
        throw new TypeError("Option stat is falsey");
      }

      const info = Statset.stat_info[option.stat];
      const children = [];  /* children of the button element */

      if (!info) {
        children.push({ tag: "h3", text: option.stat });

      } else {
        const name        = info.name_full || info.name || info.name_short || option.stat;
        const description = info.description;
        const increment   = option.increment;

        children.push({
          tag: 'h3',
          children: [
            { tag: "span", text: name + " ", style: { fontFamily: "serif" } },
            { tag: "span", 
              text: `(${ (increment>=0) ? "+":"" }${ increment })`,
              style: { fontWeight: "lighter", color: "#88f", fontFamily: "sans-serif" },
            },
          ],
        });

        const stat_current_value = this.character.base_stats[option.stat];
        const stat_next_value = stat_current_value + option.increment;
        children.push({
          tag: "p",
          children: [
            { tag: "span", text: `${ stat_current_value } → ${ stat_next_value }` }
          ],
        });

        if (description) {
          children.push({ tag: 'p', text: description, style: { fontStyle: "italic"}});
        }
      }

      const button = makeElement({
          tag: "button",
          style: {
            display:          "flex",
            justifyContent: "center",

            flexDirection:  "column",
            alignItems:      "start",
            textAlign:       "start",
            padding:         "0.5em",
            width:            "100%",
          },
          children,
        });

      button.addEventListener("click", (e) => {
          this.character.base_stats[option.stat] += option.increment;
          this.character.base_stats.level++;
          this.character.recalculateStats();
          this.pop();
        });

      list_element.children.push(makeElement({
          tag: "li",
          child: button,
          style: {
            flex:      "1 1 0",
            flexBasis:     "0",
            display:    "flex",
          },
        }));
    }

    const portrait = this.character.getImage();

    this.panel_element.appendChild(
      makeElement({
        from: portrait,
        style: {
          width:      "100%",
          maxWidth:  "400px",
          display:   "block",
          margin:   "0 auto",
        },
      })
    );

    this.panel_element.appendChild(makeElement({
      tag: "p",
      text: `Level ${ this.character.level } → Level ${ this.character.level + 1 }`,
      style: { textAlign: "end" },
    }));

    this.panel_element.appendChild(makeElement(list_element));
  }
}

export default LevelUpState;
