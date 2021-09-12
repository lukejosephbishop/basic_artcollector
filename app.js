const BASE_URL = "https://api.harvardartmuseums.org";
const KEY = "apikey=c0de24c8-838c-4a43-94aa-7b5c5b079369"; 


/*prefetch*/

function onFetchStart() {
  $("#loading").addClass("active");
}

function onFetchEnd() {
  $("#loading").removeClass("active");
}

async function fetchObjects() {
  onFetchStart();
  const url = `${BASE_URL}/object?${KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return data;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

async function fetchAllCenturies() {
  onFetchStart();
  const url = `${BASE_URL}/century?${KEY}&size=100&sort=temporalorder`;

  if (localStorage.getItem("centuries")) {
    localStorage.setItem("centuries");
    return JSON.parse(localStorage.getItem("centuries"));
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    const records = data.records;
    return records;
  } catch (error) {
    console.log(error);
  } finally {
    onFetchEnd();
  }
}

async function fetchAllClassifications() {
  onFetchStart();
  const url = `${BASE_URL}/classification?${KEY}&size=100&sort=name`;
  if (localStorage.getItem("classification")) {
    localStorage.setItem("classification");
    return JSON.parse(localStorage.getItem(`classification`));
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    const records = data.records;
    return records;
  } catch (error) {
    console.log(error);
  } finally {
    onFetchEnd();
  }
}

async function prefetchCategoryLists() {
  onFetchStart();
  try {
    const results = await Promise.all([
      fetchAllClassifications(),
      fetchAllCenturies(),
    ]);

    const [classifications, centuries] = results;
    $(".classification-count").text(`(${classifications.length})`);

    classifications.forEach((classification) => {
      $(`#select-classification`).append(
        $(`<option>`).html(
          `<option value="${classification.name}">${classification.name}</option>`
        )
      );
    });

    $(".century-count").text(`(${centuries.length})`);

    centuries.forEach((century) => {
      $(`#select-century`).append(
        $(`<option>`).html(
          `<option value="${century.name}">${century.name}</option>`
        )
      );
    });
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

/*search string*/

async function buildSearchString() {
  $("#search").on("submit", async function (event) {
    event.preventDefault();
    onFetchStart();
    try {
      const classification = $(`#select-classification`).val();
      const century = $(`#select-century`).val();
      const keywords = $(`#keywords`).val();
      const searchUrl = `${BASE_URL}/object?${KEY}&classification=${classification}&century=${century}&keyword=${keywords}`;
      const encodedUrl = encodeURI(searchUrl);
      const response = await fetch(encodedUrl);
      const { info, records } = await response.json();
      updatePreview(info, records);
    } catch (error) {
      console.log(error);
    } finally {
      onFetchEnd();
    }
  });
}

/*preview*/

function renderPreview(record) {
  const { description, primaryimageurl, title } = record;
  return $(`<div>`)
    .addClass(`object-preview`)
    .html(
      `<a href="#">
      ${primaryimageurl ? `<img src=${primaryimageurl}/>` : ""}
          <h3>${title ? title : ""}</h3>
          <h3>${description ? description : ""}</h3>
        </a>`
    )
    .data("record", record);
}

function updatePreview(info, records) {
  const root = $("#preview");
  const results = root.find(".results");
  results.empty();

  if (info.next) {
    root.find(".next").data("clickData", info.next).attr("disabled", false);
  } else {
    root.find(".next").data("clickData", null).attr("disabled", true);
  }

  if (info.prev) {
    root.find(".previous").data("clickData", info.prev).attr("disabled", false);
  } else {
    root.find(".previous").data("clickData", null).attr("disabled", true);
  }

  records.forEach((record) => {
    return results.append(renderPreview(record));
  });
}
/*on click*/

$("#preview .next, #preview .previous").on("click", async function () {
  onFetchStart();
  try {
    let clickUrl = $(this).data("clickData");
    const response = await fetch(clickUrl);
    const { info, records } = await response.json();
    updatePreview(info, records);
  } catch (error) {
    console.log(error);
  } finally {
    onFetchEnd();
  }
});

$("#preview").on("click", ".object-preview", function (event) {
  event.preventDefault();
  $(`#feature`).empty();
  const record = $(this).closest(`.object-preview`).data("record");
  console.log(record);
  renderFeature(record);
});

$("#feature").on("click", ".specific", async function (event) {
  const link = $(this).attr("href");
  console.log(link);
  if (link.startsWith("mailto")) {
    return;
  }
  event.preventDefault();
  onFetchStart();

  try {
    const response = await fetch(link);
    const { info, records } = await response.json();

    updatePreview(info, records);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

/*feature*/

async function renderFeature(record) {
  try {
    const {
      title,
      dated,
      culture,
      style,
      description,
      technique,
      medium,
      dimensions,
      department,
      division,
      people,
      contact,
      creditline,
    } = await record;

    return $("#feature").append(
      $(`<div class="object-feature">
  <header>
  <h3>${title}</h3>
  <h4>${dated}</h4>
</header>
<section class="facts">
  ${factHTML("Culture", culture, "culture")}
  ${factHTML("Style", style)}
  ${factHTML("Description", description)}
  ${factHTML("Technique", technique, "technique")}
  ${factHTML("Medium", medium, "Medium")}
  ${factHTML("Dimensions", dimensions)}
  ${factHTML("Department", department)}
  ${factHTML("Division", division)}
  ${factHTML("Creditline", creditline)}
  ${factHTML(
    "Contact",
    `<a target="_blank" href="mailto:${contact}">${contact}</a>`
  )}
  ${
    people
      ? people
          .map(function (person) {
            return factHTML("Person", person.displayname, "person");
          })
          .join("")
      : ""
  }
</section>
<section class="photos">
${photosHTML(record.images, record.primaryimageurl)}
</section>

</div>`)
    );
  } catch (error) {
    console.log(error);
  }
}

function searchURL(searchType, searchString) {
  return `${BASE_URL}/object?${KEY}&${searchType}=${searchString}`;
}

function factHTML(title, content, searchTerm = null) {
  if (!content) {
    return "";
  } else if (!searchTerm) {
    return `
    <span class="title">${title}</span>
    <span class="content">${content}</span>`;
  } else {
    return `
  <span class="title">${title}</span>
  <span class="content"><a class = "specific" href=${searchURL(
    searchTerm,
    content
  )}>${content}</a></span>`;
  }
}

function photosHTML(images, primaryimageurl) {
  if (images.length > 0) {
    return images
      .map((image) => `<img src="${image.baseimageurl}" />`)
      .join("");
  } else if (primaryimageurl) {
    return `<img src="${primaryimageurl}" />`;
  } else {
    return "";
  }
}
buildSearchString();
prefetchCategoryLists();
