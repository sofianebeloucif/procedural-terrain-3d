// Camera Controller - Orbit controls for camera

class CameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        this.target = new THREE.Vector3(0, 0, 0);
        this.minDistance = 10;
        this.maxDistance = 500;
        this.minPolarAngle = 0;
        this.maxPolarAngle = Math.PI / 2;

        this.rotateSpeed = 0.5;
        this.zoomSpeed = 1.0;
        this.panSpeed = 0.5;

        this.enabled = true;

        this.spherical = new THREE.Spherical();
        this.sphericalDelta = new THREE.Spherical();

        this.scale = 1;
        this.panOffset = new THREE.Vector3();

        this.state = {
            NONE: -1,
            ROTATE: 0,
            ZOOM: 1,
            PAN: 2
        };

        this.currentState = this.state.NONE;

        this.rotateStart = new THREE.Vector2();
        this.rotateEnd = new THREE.Vector2();
        this.rotateDelta = new THREE.Vector2();

        this.panStart = new THREE.Vector2();
        this.panEnd = new THREE.Vector2();
        this.panDelta = new THREE.Vector2();

        this.zoomStart = new THREE.Vector2();
        this.zoomEnd = new THREE.Vector2();
        this.zoomDelta = new THREE.Vector2();

        this.init();
        this.update();
    }

    init() {
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
        this.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.domElement.addEventListener('wheel', (e) => this.onMouseWheel(e));

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    onMouseDown(event) {
        if (!this.enabled) return;

        event.preventDefault();

        if (event.button === 0) {
            // Left mouse button - rotate
            this.currentState = this.state.ROTATE;
            this.rotateStart.set(event.clientX, event.clientY);
        } else if (event.button === 2) {
            // Right mouse button - pan
            this.currentState = this.state.PAN;
            this.panStart.set(event.clientX, event.clientY);
        }

        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    }

    onMouseMove = (event) => {
        if (!this.enabled) return;

        event.preventDefault();

        if (this.currentState === this.state.ROTATE) {
            this.rotateEnd.set(event.clientX, event.clientY);
            this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed);

            const element = this.domElement;
            this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight);
            this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight);

            this.rotateStart.copy(this.rotateEnd);
            this.update();
        } else if (this.currentState === this.state.PAN) {
            this.panEnd.set(event.clientX, event.clientY);
            this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);
            this.pan(this.panDelta.x, this.panDelta.y);
            this.panStart.copy(this.panEnd);
            this.update();
        }
    }

    onMouseUp = (event) => {
        if (!this.enabled) return;

        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);

        this.currentState = this.state.NONE;
    }

    onMouseWheel(event) {
        if (!this.enabled) return;

        event.preventDefault();
        event.stopPropagation();

        if (event.deltaY < 0) {
            this.dollyIn(this.getZoomScale());
        } else if (event.deltaY > 0) {
            this.dollyOut(this.getZoomScale());
        }

        this.update();
    }

    onKeyDown(event) {
        if (!this.enabled) return;

        if (event.code === 'Space') {
            event.preventDefault();
            this.reset();
        }
    }

    rotateLeft(angle) {
        this.sphericalDelta.theta -= angle;
    }

    rotateUp(angle) {
        this.sphericalDelta.phi -= angle;
    }

    pan(deltaX, deltaY) {
        const offset = new THREE.Vector3();
        const element = this.domElement;

        const position = this.camera.position;
        offset.copy(position).sub(this.target);
        let targetDistance = offset.length();

        targetDistance *= Math.tan((this.camera.fov / 2) * Math.PI / 180.0);

        this.panLeft(2 * deltaX * targetDistance / element.clientHeight, this.camera.matrix);
        this.panUp(2 * deltaY * targetDistance / element.clientHeight, this.camera.matrix);
    }

    panLeft(distance, objectMatrix) {
        const v = new THREE.Vector3();
        v.setFromMatrixColumn(objectMatrix, 0);
        v.multiplyScalar(-distance);
        this.panOffset.add(v);
    }

    panUp(distance, objectMatrix) {
        const v = new THREE.Vector3();
        v.setFromMatrixColumn(objectMatrix, 1);
        v.multiplyScalar(distance);
        this.panOffset.add(v);
    }

    dollyIn(dollyScale) {
        this.scale /= dollyScale;
    }

    dollyOut(dollyScale) {
        this.scale *= dollyScale;
    }

    getZoomScale() {
        return Math.pow(0.95, this.zoomSpeed);
    }

    update() {
        const offset = new THREE.Vector3();
        const quat = new THREE.Quaternion().setFromUnitVectors(
            this.camera.up,
            new THREE.Vector3(0, 1, 0)
        );
        const quatInverse = quat.clone().invert();

        const position = this.camera.position;

        offset.copy(position).sub(this.target);
        offset.applyQuaternion(quat);

        this.spherical.setFromVector3(offset);

        this.spherical.theta += this.sphericalDelta.theta;
        this.spherical.phi += this.sphericalDelta.phi;

        this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
        this.spherical.makeSafe();

        this.spherical.radius *= this.scale;
        this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

        this.target.add(this.panOffset);

        offset.setFromSpherical(this.spherical);
        offset.applyQuaternion(quatInverse);

        position.copy(this.target).add(offset);

        this.camera.lookAt(this.target);

        this.sphericalDelta.set(0, 0, 0);
        this.scale = 1;
        this.panOffset.set(0, 0, 0);
    }

    reset() {
        this.target.set(0, 0, 0);
        this.camera.position.set(0, 50, 100);
        this.camera.lookAt(this.target);
        this.update();
    }

    dispose() {
        this.domElement.removeEventListener('contextmenu', (e) => e.preventDefault());
        this.domElement.removeEventListener('mousedown', (e) => this.onMouseDown(e));
        this.domElement.removeEventListener('wheel', (e) => this.onMouseWheel(e));
        window.removeEventListener('keydown', (e) => this.onKeyDown(e));
    }
}