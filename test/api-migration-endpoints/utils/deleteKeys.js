export default function deleteKeys (obj1, obj2, keysToDelete) {
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    for (const obj of obj1) {
      for (const key of keysToDelete) {
        delete obj[key]
      }
    }

    for (const obj of obj2) {
      for (const key of keysToDelete) {
        delete obj[key]
      }
    }
  } else {
    for (const key of keysToDelete) {
      delete obj1[key]
      delete obj2[key]
    }
  }
}
