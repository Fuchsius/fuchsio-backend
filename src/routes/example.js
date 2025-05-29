const express = require("express");
const router = express.Router();

// Sample data (in a real app, this would come from a database)
let examples = [
  {
    id: 1,
    name: "Example 1",
    description: "This is the first example",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Example 2",
    description: "This is the second example",
    createdAt: new Date().toISOString(),
  },
];

// GET /api/v1/examples - Get all examples
router.get("/", (req, res) => {
  try {
    res.json({
      success: true,
      data: examples,
      count: examples.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/v1/examples/:id - Get example by ID
router.get("/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const example = examples.find((e) => e.id === id);

    if (!example) {
      return res.status(404).json({
        success: false,
        error: "Example not found",
      });
    }

    res.json({
      success: true,
      data: example,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/v1/examples - Create new example
router.post("/", (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: "Name and description are required",
      });
    }

    const newExample = {
      id: examples.length + 1,
      name,
      description,
      createdAt: new Date().toISOString(),
    };

    examples.push(newExample);

    res.status(201).json({
      success: true,
      data: newExample,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PUT /api/v1/examples/:id - Update example
router.put("/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;

    const exampleIndex = examples.findIndex((e) => e.id === id);

    if (exampleIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Example not found",
      });
    }

    if (name) examples[exampleIndex].name = name;
    if (description) examples[exampleIndex].description = description;
    examples[exampleIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: examples[exampleIndex],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// DELETE /api/v1/examples/:id - Delete example
router.delete("/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const exampleIndex = examples.findIndex((e) => e.id === id);

    if (exampleIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Example not found",
      });
    }

    examples.splice(exampleIndex, 1);

    res.json({
      success: true,
      message: "Example deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
