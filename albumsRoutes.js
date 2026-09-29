const express = require("express");
const {
  listAlbums,
  createAlbum,
  updateAlbum,
  deleteAlbum,
} = require("../controllers/albumsController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", listAlbums);
router.post("/", requireAuth, createAlbum);
router.put("/:id", requireAuth, updateAlbum);
router.delete("/:id", requireAuth, deleteAlbum);

module.exports = router;