function deleteKey (obj, key) {
  if (Array.isArray(key)) {
    if (key[2] && obj[key[0]] && obj[key[0]][key[1]]) {
      delete obj[key[0]][key[1]][key[2]]
    } else if (key[1] && obj[key[0]]) {
      delete obj[key[0]][key[1]]
    }
  } else {
    delete obj[key]
  }
}

export default function deleteKeys (obj1, obj2, keysToDelete) {
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    for (const obj of obj1) {
      for (const key of keysToDelete) {
        deleteKey(obj, key)
      }
    }

    for (const obj of obj2) {
      for (const key of keysToDelete) {
        deleteKey(obj, key)
      }
    }
  } else {
    for (const key of keysToDelete) {
      deleteKey(obj1, key)
      deleteKey(obj2, key)
    }
  }
}
