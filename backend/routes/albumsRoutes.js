const express = require("express");
const {
  listAlbums,
  createAlbum,
  updateAlbum,
  deleteAlbum,
} = require("../controllers/albumsController");

const router = express.Router();

router.get("/", listAlbums);
router.post("/", createAlbum);
router.put("/:id", updateAlbum);
router.delete("/:id", deleteAlbum);

module.exports = router;
