const boxIndexesToId = require('./box-indexes-to-id');
const mergeBoxes = require('./merge-boxes');
const uniq = require('./uniq');

const mergeLocked = require('./merge-groups');

module.exports = function ({coupleBoxes, nWorkers}) {
	const locked = [];
	const lockedBoxIds = {};

	// Const checkLocked = function(){
	// 	const boxIds2 = locked.filter(l => !!l).map(g => g.boxes.map(boxIndexesToId)).reduce((a,b) => a.concat(b), [])
	// 	const dups = duplicated(boxIds2)
	// 	if(dups.length > 0){
	// 		console.log(dups, boxIds2)
	// 		throw(new Error(`dups lenght should be 0`))
	// 	}
	// }
	const addNewLock = function (lock) {
		const lockId = locked.length;

		locked.push(lock);
		const boxIds = lock.boxes.map(o => boxIndexesToId(o));
		boxIds.forEach(id => {
			lockedBoxIds[id] = lockId;
		});
	};

	const deleteLock = function (lockId) {
		// Console.log({lockId, lock: locked[lockId]})
		locked[lockId].boxes.map(o => boxIndexesToId(o)).forEach(id => {
			delete lockedBoxIds[id];
		});
		locked[lockId] = null;
	};

	const isUsedBoxId = (id => typeof (lockedBoxIds[id]) === 'number');
	coupleBoxes.forEach(boxes => {
		const boxIds = boxes.map(o => boxIndexesToId(o));

		const values = boxIds.filter(o => isUsedBoxId(o));

		if (values.length === 0) {
			// The box is locked
			addNewLock({boxes: boxes.concat(), merged: mergeBoxes({boxes, nWorkers})});
		} else if (values.length === boxes.length) {
			const lockIndexes = uniq(values.map(id => lockedBoxIds[id]));
			if (uniq(lockIndexes).length !== 1) {
				const newLocks = mergeLocked({groups: lockIndexes.map(index => locked[index]), nWorkers});

				// Debugging
				lockIndexes.forEach(o => deleteLock(o));
				newLocks.forEach(o => addNewLock(o));
			}
		} else {
			const boxLocked = boxIds.map((id, index) => ({id, index})).filter(({id}) => isUsedBoxId(id)).map(({index}) => boxes[index])[0];
			const boxNotLocked = boxIds.map((id, index) => ({id, index})).filter(({id}) => !isUsedBoxId(id)).map(({index}) => boxes[index])[0];

			const boxLockedId = boxIndexesToId(boxLocked);
			const boxNotLockedId = boxIndexesToId(boxNotLocked);

			const lockId = lockedBoxIds[boxLockedId];
			const lockedItem = locked[lockId];
			let newMerged;
			let newBoxes;
			if (!lockedItem.boxes.map(b => b.workerId).includes(boxNotLocked.workerId)) {
				newBoxes = lockedItem.boxes.concat([boxNotLocked]);
				newMerged = mergeBoxes({boxes: newBoxes, nWorkers});
			}

			if (newMerged && newMerged.confidence > lockedItem.merged.confidence) {
				lockedBoxIds[boxNotLockedId] = lockId;
				lockedItem.boxes = newBoxes;
				lockedItem.merged = newMerged;
			} else {
				const boxes = [boxNotLocked];
				addNewLock({
					boxes,
					merged: mergeBoxes({boxes, nWorkers})
				});
			}
		}
	});
	return locked.filter(l => Boolean(l));
};
