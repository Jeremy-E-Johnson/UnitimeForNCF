Vue.component('map-manager', {
  props: ['rooms', 'map'],
  data: function() {
    return {
      show: false,
      currentRoomName: false,
      isRoomActive: false,
      isTooltipActive: false,
      currentRoomBoundingBox: false
    };
  },
  template: `
    <div>
      <tooltip
        v-if="show"
        v-bind:el="currentRoomBoundingBox"
        v-bind:room="currentRoom"
        v-on:active="isTooltipActive = true"
        v-on:close="isTooltipActive = false">
      </tooltip>
      <room-map
        class="centered"
        v-bind:map="map"
        v-on:loaded="registerRooms">
      </room-map>
    </div>
  `,
  computed: {
    currentRoom: function() {
      if (this.currentRoomName) {
        return this.rooms[this.currentRoomName];
      }

      return false;
    },
    currentEl: function() {
      if (this.currentRoomName) {
        return 'room-' + this.currentRoomName;
      }

      return false;
    }
  },
  watch: {
    isRoomActive: function() {
      this.update();
    },
    isTooltipActive: function() {
      this.update();
    }
  },
  methods: {
    update: _.debounce(function() {
      if (this.isTooltipActive || this.isRoomActive) {
        this.show = true;
      }
      else {
        this.show = false;
      }
    }, 50),
    registerRooms: function(doc) {
      var vm = this;

      Object.keys(this.rooms).forEach(function(key) {
        vm.registerRoom(
          key,
          doc.querySelector('#room-' + key)
        );
      });
    },
    registerRoom: function(room, el) {
      var vm = this;

      el.addEventListener('mouseover', function() {
        vm.currentRoomName = room;
        vm.isRoomActive = true;
        vm.currentRoomBoundingBox = el.getBoundingClientRect();
      });

      el.addEventListener('mouseleave', function() {
        vm.isRoomActive = false;
      });
    }
  }
});

Vue.component('tooltip', {
  props: ['el', 'room'],
  data: function() {
    return {
      width: 650,
      height: 325
    };
  },
  template: `
    <transition name="slide-fade">
      <div
        class="tooltip"
        ref="tooltip"
        v-bind:style="styleObject"
        v-on:mouseover="$emit('active')"
        v-on:mouseleave="$emit('close')">
        <room-card v-bind:room="room"></room-card>
      </div>
    </transition>
  `,
  computed: {
    left: function() {
      var shift = this.width / 8;
      if (this.el.left <= shift) {
        return this.el.left + shift;
      }

      return this.el.left - shift;
    },
    top: function() {
      var buffer = 50;
      if (this.el.top <= this.height + buffer) {
        return this.el.top + this.el.height;
      }

      return this.el.top - this.height;
    },
    styleObject: function() {
      return {
        left: this.left + 'px',
        top: this.top + 'px'
      };
    }
  }
});

Vue.component('room-map', {
  props: ['map'],
  template: `
    <div
      ref="container"
      v-bind:style="map.style">
    </div>
  `,
  mounted: function() {
    this.$nextTick(this.loadMap)
  },
  methods: {
    loadMap: function() {
      this.$refs.container.innerHTML = this.map.source;

      var doc = this.$refs.container.getElementsByTagName('svg');

      if (doc.length === 1) {
        doc = doc[0];
        this.$emit('loaded', doc);
      }
    }
  }
});

var formatFeature = {
  exclusive: {
    show: function(value) {
      return true;
    },
    content: function(value) {
      var snippet = "Anyone can use this room";
      if (value.length > 0) {
        snippet = "Typically used by " + value;
      }

      return `
        <i class="fas fa-graduation-cap"></i> ${snippet}
      `;
    }
  },
  capacity: {
    show: function(value) {
      return true;
    },
    content: function(value) {
      return `
        <i class="fas fa-users"></i> Room for ${value} people
      `;
    }
  },
  projectors: {
    show: function(value) {
      return value === 'Y';
    },
    content: function(value) {
      return `
        <i class="fas fa-video"></i> Includes a projector
      `;
    }
  },
  boards: {
    show: function(value) {
      var numWhiteboards = (value.match(/W/g) || []).length;
      var numBlackboards = (value.match(/B/g) || []).length;

      return numWhiteboards > 0 || numBlackboards > 0;
    },
    content: function(value) {
      var snippet = "";

      var numWhiteboards = (value.match(/W/g) || []).length;
      var numBlackboards = (value.match(/B/g) || []).length;

      if (numWhiteboards > 0) {
        snippet += numWhiteboards + " whiteboard";

        if (numWhiteboards > 1) {
          snippet += "s";
        }
      }

      if (numBlackboards > 0) {
        snippet += " and " + numBlackboards + " blackboard";

        if (numBlackboards > 1) {
          snippet += "s";
        }
      }

      snippet += " are available";

      return `
        <i class="fas fa-magic"></i> ${snippet}
      `;
    }
  },
  rearrangableFurniture: {
    show: function(value) {
      return value === 'Y';
    },
    content: function(value) {
      return `
        <i class="fas fa-couch"></i> Furniture is rearrangable
      `;
    }
  },
  computers: {
    show: function(value) {
      return value > 0;
    },
    content: function(value) {
      return `
        <i class="fas fa-desktop"></i> ${value} computer(s) are available
      `;
    }
  },
  outlets: {
    show: function(value) {
      return value === 'Y';
    },
    content: function(value) {
      return `
        <i class="fas fa-plug"></i> Includes outlets
      `;
    }
  }
};

Vue.component('room-card', {
  props: ['room'],
  template: `
    <div class="room-card">
      <room-card-thumbnail v-bind:thumbnails="room.thumbnails"></room-card-thumbnail>
      <room-card-content v-bind:room="room"></room-card-content>
    </div>
  `
});

Vue.component('room-card-thumbnail', {
  props: ['thumbnails'],
  template: `
    <div v-if="hasThumbnails" class="room-card-thumbnail" title="An image of the room from inside">
      <img v-bind:src="thumbnailPreview">
    </div>
  `,
  computed: {
    thumbnailPreview: function() {
      return this.thumbnails[0].source;
    },
    hasThumbnails: function() {
      return this.thumbnails.length > 0;
    }
  }
});

Vue.component('room-card-content', {
  props: ['room'],
  template: `
    <div class="room-card-content">
      <div class="room-card-content-inner">
        <room-card-header
          v-bind:building="room.building"
          v-bind:name="room.name"
          v-bind:nickname="room.nickname">
        </room-card-header>
        <room-card-description
          v-bind:room="room">
        </room-card-description>
        <room-card-feature-list
          v-bind:features="room.features">
        </room-card-feature-list>
      </div>
    </div>
  `
});

Vue.component('room-card-header', {
  props: ['building', 'name', 'nickname'],
  template: `
    <div class="header">
      <span v-if="nickname" class="nickname" title="Room nickname">
        {{ nickname }}
      </span>
      <span class="name">
        <span title="Room building">{{ building }}</span>:
        <span title="Room name and number">{{ name }}</span>
      </span>
    </div>
  `
});

Vue.component('room-card-description', {
  props: ['room'],
  template: `
    <div v-if="hasDescription" class="description" title="A brief description of the room">
      <span>{{ description }}</span>
    </div>
  `,
  computed: {
    description: function() {
      return "This room includes " + this.room.details;
    },
    hasDescription: function() {
      return this.room.details.length > 0;
    }
  }
});

Vue.component('room-card-feature-list', {
  props: ['features'],
  template: `
    <div class="room-card-feature-list" title="A list of features the room includes/has">
      <ul>
        <li
          is="room-card-feature"
          v-for="(feature, index) in features"
          v-bind:key="index"
          v-bind:feature="feature">
        </li>
      </ul>
    </div>
  `
});

Vue.component('room-card-feature', {
  props: ['feature'],
  template: `
    <div v-if="show" class="room-card-feature" v-html="content"></div>
  `,
  computed: {
    show: function() {
      return formatFeature[this.feature.name].show(this.feature.value);
    },
    content: function() {
      return formatFeature[this.feature.name].content(this.feature.value);
    }
  }
});
