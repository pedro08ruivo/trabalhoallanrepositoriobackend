const User = require('../user/user.model');

const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user?.id, {
            attributes: ['id', 'isAdmin', 'active']
        });

        if (!user || !user.active) {
            return res.status(401).json({ error: 'User is inactive or no longer exists.' });
        }
        if (!user.isAdmin) {
            return res.status(403).json({ error: 'Administrator access required.' });
        }

        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = isAdmin;